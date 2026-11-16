import { SourceError, type SourceKind } from "../job.js"

const TIMEOUT_MS = 10_000
const ATTEMPTS = 3

/**
 * GET a public feed. Timeouts, network errors and 5xx answers are retried;
 * whatever is left becomes a SourceError.
 */
export async function getText(url: string, kind: SourceKind, fetchImpl: typeof fetch, accept: string): Promise<string> {
    let last: SourceError | null = null
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        if (attempt > 1) await new Promise(r => setTimeout(r, 500 * attempt))
        let res: Response
        try {
            res = await fetchImpl(url, {
                headers: { accept, "user-agent": "syncroles/0.1 (+https://syncroles.com)" },
                signal: AbortSignal.timeout(TIMEOUT_MS),
                redirect: "follow",
            })
        } catch (err) {
            const timedOut = (err as Error).name === "TimeoutError"
            last = new SourceError(
                timedOut ? `${kind} did not answer in time. Please try again in a minute.` : `Could not reach ${kind}. Please try again in a minute.`,
                kind
            )
            continue
        }
        if (res.status === 404) throw new SourceError(`No ${kind} job board found for this handle.`, kind, 404)
        if (res.status >= 500 || res.status === 429) {
            last = new SourceError(`${kind} answered HTTP ${res.status}. Please try again in a minute.`, kind, res.status)
            continue
        }
        if (!res.ok) throw new SourceError(`${kind} answered HTTP ${res.status}.`, kind, res.status)
        try {
            return await res.text()
        } catch {
            last = new SourceError(`${kind} stopped answering part-way. Please try again in a minute.`, kind)
        }
    }
    throw last!
}

export async function getJson(url: string, kind: SourceKind, fetchImpl: typeof fetch): Promise<unknown> {
    const text = await getText(url, kind, fetchImpl, "application/json")
    try {
        return JSON.parse(text)
    } catch {
        throw new SourceError(`${kind} did not return JSON.`, kind)
    }
}

export function str(value: unknown): string | null {
    if (typeof value === "string") return value.trim() || null
    if (typeof value === "number") return String(value)
    return null
}

export function isoDate(value: unknown): string | null {
    if (value === null || value === undefined || value === "") return null
    const d = new Date(value as string | number)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Handles end up in URLs: allow only what the ATSs allow in board names. */
export function safeHandle(handle: string, kind: SourceKind): string {
    const h = handle.trim()
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(h)) {
        throw new SourceError(`"${handle}" is not a valid ${kind} handle.`, kind)
    }
    return h
}
