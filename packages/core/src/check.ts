import { decodeHTML } from "entities"
import type { Job, SourceConfig, SourceKind } from "./job.js"

/** One link on a careers page that points at a single posting on a job board. */
export interface PostingLink {
    kind: SourceKind
    handle: string
    /** Posting id as the job board uses it in its own API. */
    id: string
    url: string
    /** Visible link text, whitespace collapsed. Often the role title, sometimes "Apply". */
    text: string
    options?: Record<string, string>
}

export interface CheckResult {
    source: SourceConfig
    /** True when the page carries Framer's generator tag. */
    framer: boolean
    /** Postings the page links to. */
    linked: number
    /** Open roles on the job board. */
    open: number
    /** Linked postings that are not on the public board any more (closed or unlisted). */
    closedButListed: { title: string; url: string }[]
    /** Open roles whose posting is not linked and whose title does not appear on the page. */
    openButMissing: { title: string; url: string }[]
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

/** Recognises a posting URL. Returns null for board home pages and anything else. */
export function parsePostingUrl(raw: string): Omit<PostingLink, "url" | "text"> | null {
    let u: URL
    try {
        u = new URL(raw)
    } catch {
        return null
    }
    const host = u.hostname.toLowerCase()
    const parts = u.pathname.split("/").filter(Boolean)
    const p0 = parts[0] ?? ""
    const p1 = parts[1] ?? ""
    const p2 = parts[2] ?? ""
    if (host === "jobs.ashbyhq.com" && p0 && new RegExp(`^${UUID}$`, "i").test(p1)) {
        return { kind: "ashby", handle: decodeURIComponent(p0), id: p1.toLowerCase() }
    }
    if ((host === "jobs.lever.co" || host === "jobs.eu.lever.co") && p0 && new RegExp(`^${UUID}$`, "i").test(p1)) {
        return {
            kind: "lever",
            handle: decodeURIComponent(p0),
            id: p1.toLowerCase(),
            ...(host === "jobs.eu.lever.co" ? { options: { region: "eu" } } : {}),
        }
    }
    if (/^(job-)?boards\.greenhouse\.io$/.test(host) && p0 && p1 === "jobs" && /^\d+$/.test(p2)) {
        return { kind: "greenhouse", handle: decodeURIComponent(p0), id: p2 }
    }
    const gh = u.searchParams.get("gh_jid")
    if (/^(job-)?boards\.greenhouse\.io$/.test(host) && p0 && gh && /^\d+$/.test(gh)) {
        return { kind: "greenhouse", handle: decodeURIComponent(p0), id: gh }
    }
    const personio = host.match(/^([a-z0-9-]+)\.jobs\.personio\.(de|com)$/)
    if (personio && personio[1] && p0 === "job" && /^\d+$/.test(p1)) {
        return {
            kind: "personio",
            handle: personio[1],
            id: p1,
            ...(personio[2] === "com" ? { options: { domain: "com" } } : {}),
        }
    }
    return null
}

/** All posting links on a page, one per posting id. */
export function extractPostingLinks(html: string, pageUrl: string): PostingLink[] {
    const out = new Map<string, PostingLink>()
    const re = /<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi
    for (const m of html.matchAll(re)) {
        const href = decodeHTML(m[2] ?? m[3] ?? "")
        let abs: string
        try {
            abs = new URL(href, pageUrl).toString()
        } catch {
            continue
        }
        const parsed = parsePostingUrl(abs)
        if (!parsed) continue
        const text = visibleText(m[4] ?? "")
        const key = `${parsed.kind}:${parsed.handle.toLowerCase()}:${parsed.id}`
        const prev = out.get(key)
        // Keep the most descriptive link text seen for the posting.
        if (!prev || text.length > prev.text.length) out.set(key, { ...parsed, url: abs, text })
    }
    return [...out.values()]
}

/** The job board most of the page's posting links point at. */
export function dominantSource(links: PostingLink[]): SourceConfig | null {
    const counts = new Map<string, { n: number; link: PostingLink }>()
    for (const l of links) {
        const key = `${l.kind}:${l.handle.toLowerCase()}`
        const c = counts.get(key)
        counts.set(key, { n: (c?.n ?? 0) + 1, link: c?.link ?? l })
    }
    const best = [...counts.values()].sort((a, b) => b.n - a.n)[0]
    if (!best) return null
    return { kind: best.link.kind, handle: best.link.handle, ...(best.link.options ? { options: best.link.options } : {}) }
}

export function isFramerPage(html: string): boolean {
    return /<meta[^>]+name=["']generator["'][^>]+content=["']Framer/i.test(html)
}

/** Compares a careers page with the open roles on its job board. */
export function compareWithBoard(html: string, pageUrl: string, source: SourceConfig, jobs: Job[]): CheckResult {
    const links = extractPostingLinks(html, pageUrl).filter(
        l => l.kind === source.kind && l.handle.toLowerCase() === source.handle.toLowerCase()
    )
    const openIds = new Set(jobs.map(j => j.id.toLowerCase()))
    const linkedIds = new Set(links.map(l => l.id))
    const pageText = normalise(visibleText(html))
    const closedButListed = links
        .filter(l => !openIds.has(l.id))
        .map(l => ({ title: l.text && !/^(apply|apply now|view|view role|learn more|read more|details)$/i.test(l.text) ? l.text : "(untitled link)", url: l.url }))
    const openButMissing = jobs
        .filter(j => !linkedIds.has(j.id.toLowerCase()) && !pageText.includes(normalise(j.title)))
        .map(j => ({ title: j.title, url: j.jobUrl }))
    return {
        source,
        framer: isFramerPage(html),
        linked: links.length,
        open: jobs.length,
        closedButListed,
        openButMissing,
    }
}

function visibleText(html: string): string {
    return decodeHTML(
        html
            .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
            .replace(/<[^>]+>/g, " ")
    )
        .replace(/\s+/g, " ")
        .trim()
}

function normalise(s: string): string {
    return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
}
