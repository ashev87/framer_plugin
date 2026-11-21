import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { compareWithBoard, dominantSource, extractPostingLinks, isFramerPage, listJobs, SourceError, type CheckResult, type Job, type SourceConfig } from "@syncroles/core"
import { Hono } from "hono"

const MAX_BYTES = 3_000_000
const TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 3

export class CheckError extends Error {}

/** True for loopback, private, link-local, CGNAT, multicast and reserved addresses. */
export function isPrivateAddress(ip: string): boolean {
    if (isIP(ip) === 4) {
        const [a = 0, b = 0] = ip.split(".").map(Number)
        return (
            a === 0 || a === 10 || a === 127 || a >= 224 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 198 && (b === 18 || b === 19))
        )
    }
    const v6 = ip.toLowerCase()
    if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7))
    return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff")
}

/** Only public http(s) URLs on the default ports. */
export async function assertPublicUrl(raw: string, resolve: (host: string) => Promise<string[]> = defaultResolve): Promise<URL> {
    let u: URL
    try {
        u = new URL(raw)
    } catch {
        throw new CheckError("Enter a full address, for example https://yourcompany.com/careers.")
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new CheckError("Only http and https addresses can be checked.")
    if (u.port && u.port !== "80" && u.port !== "443") throw new CheckError("Only standard web ports can be checked.")
    if (u.username || u.password) throw new CheckError("Addresses with a login cannot be checked.")
    const host = u.hostname.replace(/^\[|\]$/g, "")
    const addresses = isIP(host) ? [host] : await resolve(host).catch(() => [])
    if (addresses.length === 0) throw new CheckError("That address could not be found.")
    if (addresses.some(isPrivateAddress)) throw new CheckError("That address cannot be checked.")
    return u
}

async function defaultResolve(host: string): Promise<string[]> {
    return (await lookup(host, { all: true })).map(a => a.address)
}

/** Fetches a public page, re-checking every redirect target. */
export async function fetchPublicPage(raw: string, fetchImpl: typeof fetch = fetch, resolve?: (host: string) => Promise<string[]>): Promise<{ url: string; html: string }> {
    let url = (await assertPublicUrl(raw, resolve)).toString()
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        let res: Response
        try {
            res = await fetchImpl(url, {
                redirect: "manual",
                signal: AbortSignal.timeout(TIMEOUT_MS),
                headers: { accept: "text/html", "user-agent": "SyncRoles careers page checker (+https://syncroles.com/check)" },
            })
        } catch {
            throw new CheckError("The page did not answer. Check the address and try again.")
        }
        if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
            url = (await assertPublicUrl(new URL(res.headers.get("location")!, url).toString(), resolve)).toString()
            continue
        }
        if (!res.ok) throw new CheckError(`The page answered HTTP ${res.status}.`)
        const type = res.headers.get("content-type") ?? ""
        if (!/text\/html|application\/xhtml/i.test(type)) throw new CheckError("That address is not a web page.")
        const html = await readCapped(res)
        return { url, html }
    }
    throw new CheckError("The page redirected too many times.")
}

async function readCapped(res: Response): Promise<string> {
    const reader = res.body?.getReader()
    if (!reader) return ""
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_BYTES) {
            await reader.cancel()
            throw new CheckError("The page is too large to check.")
        }
        chunks.push(value)
    }
    return new TextDecoder().decode(Buffer.concat(chunks))
}

export type CheckResponse =
    | ({ status: "checked"; url: string } & CheckResult)
    | { status: "no-links"; url: string; framer: boolean }

export async function runCheck(
    raw: string,
    deps: { fetchPage?: typeof fetchPublicPage; listJobs?: (c: SourceConfig) => Promise<Job[]> } = {}
): Promise<CheckResponse> {
    const { url, html } = await (deps.fetchPage ?? fetchPublicPage)(raw)
    const source = dominantSource(extractPostingLinks(html, url))
    if (!source) return { status: "no-links", url, framer: isFramerPage(html) }
    const jobs = await (deps.listJobs ?? (c => listJobs(c)))(source)
    return { status: "checked", url, ...compareWithBoard(html, url, source, jobs) }
}

/** Small in-memory limiter: enough to stop one visitor from hammering job boards through us. */
export function rateLimiter(perMinute: number) {
    const hits = new Map<string, number[]>()
    return (key: string): boolean => {
        const now = Date.now()
        const recent = (hits.get(key) ?? []).filter(t => now - t < 60_000)
        if (recent.length >= perMinute) {
            hits.set(key, recent)
            return false
        }
        recent.push(now)
        hits.set(key, recent)
        if (hits.size > 10_000) hits.clear()
        return true
    }
}

export function createCheckRoutes(deps: Parameters<typeof runCheck>[1] = {}): Hono {
    const app = new Hono()
    const allow = rateLimiter(6)
    app.post("/api/check", async c => {
        const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown"
        if (!allow(ip)) return c.json({ error: "Too many checks. Please wait a minute." }, 429)
        let url: unknown
        try {
            url = ((await c.req.json()) as any)?.url
        } catch {
            return c.json({ error: "Request body must be JSON." }, 400)
        }
        if (typeof url !== "string" || url.length > 2000) return c.json({ error: "Enter the address of your careers page." }, 400)
        const withScheme = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
        try {
            const result = await runCheck(withScheme, deps)
            console.log(`check ${new URL(result.url).hostname} ${result.status}${result.status === "checked" ? ` ${result.source.kind} closed=${result.closedButListed.length} missing=${result.openButMissing.length}` : ""}`)
            return c.json(result)
        } catch (err) {
            if (err instanceof CheckError || err instanceof SourceError) return c.json({ error: err.message }, 422)
            console.error(`check error ${(err as Error).name}`)
            return c.json({ error: "Something went wrong on our side." }, 500)
        }
    })
    return app
}
