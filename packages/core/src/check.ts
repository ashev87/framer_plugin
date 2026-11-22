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
    /** For links without text of their own: the texts of the job card before the link, in page order. */
    cardTexts?: string[]
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
    /** The page also links to the full job board, so a short featured list may be on purpose. */
    linksToBoard: boolean
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
    const ghEu = /^(job-)?boards\.eu\.greenhouse\.io$/.test(host)
    if ((ghEu || /^(job-)?boards\.greenhouse\.io$/.test(host)) && p0 && p1 === "jobs" && /^\d+$/.test(p2)) {
        return { kind: "greenhouse", handle: decodeURIComponent(p0), id: p2, ...(ghEu ? { options: { region: "eu" } } : {}) }
    }
    const gh = u.searchParams.get("gh_jid")
    if ((ghEu || /^(job-)?boards\.greenhouse\.io$/.test(host)) && p0 && gh && /^\d+$/.test(gh)) {
        return { kind: "greenhouse", handle: decodeURIComponent(p0), id: gh, ...(ghEu ? { options: { region: "eu" } } : {}) }
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
        let text = cleanLinkText(visibleText(m[4] ?? ""))
        let card: string[] | undefined
        if (!text) {
            card = cardTextsBefore(html, m.index ?? 0)
            text = guessCardTitle(card)
        }
        const key = `${parsed.kind}:${parsed.handle.toLowerCase()}:${parsed.id}`
        const prev = out.get(key)
        // Keep the most descriptive link text seen for the posting; own link text beats card text.
        if (!prev || (prev.cardTexts && !card) || (!!prev.cardTexts === !!card && text.length > prev.text.length)) {
            out.set(key, { ...parsed, url: abs, text, ...(card ? { cardTexts: card } : {}) })
        }
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
    const offset = learnCardTitleOffset(links, jobs)
    const closedButListed = links
        .filter(l => !openIds.has(l.id))
        .map(l => {
            const learned = offset !== null && l.cardTexts ? l.cardTexts[l.cardTexts.length - 1 - offset] : undefined
            return { title: learned || l.text || "(untitled link)", url: l.url }
        })
    const openButMissing = jobs
        .filter(j => !linkedIds.has(j.id.toLowerCase()) && !pageText.includes(normalise(j.title)))
        .map(j => ({ title: j.location ? `${j.title} · ${j.location}` : j.title, url: j.jobUrl }))
    return {
        source,
        framer: isFramerPage(html),
        linked: links.length,
        open: jobs.length,
        closedButListed,
        openButMissing,
        linksToBoard: linksToBoardHome(html, pageUrl, source),
    }
}

/** True when the page links to the board's own listing page, e.g. "See all open roles". */
export function linksToBoardHome(html: string, pageUrl: string, source: SourceConfig): boolean {
    const handle = source.handle.toLowerCase()
    for (const m of html.matchAll(/\bhref\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
        let u: URL
        try {
            u = new URL(decodeHTML(m[2] ?? m[3] ?? ""), pageUrl)
        } catch {
            continue
        }
        const host = u.hostname.toLowerCase()
        const parts = u.pathname.split("/").filter(Boolean).map(x => decodeURIComponent(x).toLowerCase())
        if (parsePostingUrl(u.toString())) continue
        if (source.kind === "ashby" && host === "jobs.ashbyhq.com" && parts[0] === handle) return true
        if (source.kind === "lever" && /^jobs(\.eu)?\.lever\.co$/.test(host) && parts[0] === handle) return true
        if (source.kind === "greenhouse" && /^(job-)?boards(\.eu)?\.greenhouse\.io$/.test(host) && parts[0] === handle) return true
        if (source.kind === "personio" && host.startsWith(`${handle}.jobs.personio.`)) return true
    }
    return false
}

const CTA = /^(apply|apply now|view|view role|view job|open|new|learn more|read more|details|see details)$/i
const LOCATION_LIKE = /\s·\s|\bremote\b|\bhybrid\b|\bin[- ]office\b|\bon[- ]?site\b|\bfull[- ]time\b|\bpart[- ]time\b/i

/**
 * For links with no text of their own (an icon, "View role", an empty overlay on a job card):
 * the texts of the card before the link. The card starts after the previous link closes.
 */
function cardTextsBefore(html: string, linkStart: number): string[] {
    let before = html.slice(Math.max(0, linkStart - 3000), linkStart)
    const lastLink = before.lastIndexOf("</a>")
    if (lastLink >= 0) before = before.slice(lastLink + 4)
    before = before.replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
    const texts: string[] = []
    for (const m of before.matchAll(/>([^<>]+)</g)) {
        const t = decodeHTML(m[1] ?? "").replace(/\s+/g, " ").trim()
        if (t.length >= 2 && t.length <= 120 && !CTA.test(t)) texts.push(t)
    }
    return texts
}

/** Best guess at a role title among card texts: the longest one that does not read like a location or job type. */
function guessCardTitle(texts: string[]): string {
    const plain = texts.filter(t => !LOCATION_LIKE.test(t))
    const pool = plain.length ? plain : texts
    return pool.reduce((best, t) => (t.length > best.length ? t : best), "")
}

/**
 * Cards on one page share a layout. The open roles whose card holds their real title show which
 * card text is the title (counted from the link back), so the same position names the closed ones.
 */
function learnCardTitleOffset(links: PostingLink[], jobs: Job[]): number | null {
    const titles = new Map(jobs.map(j => [j.id.toLowerCase(), normalise(j.title)]))
    const votes = new Map<number, number>()
    for (const l of links) {
        const title = titles.get(l.id)
        if (!title || !l.cardTexts) continue
        const i = l.cardTexts.map(normalise).lastIndexOf(title)
        if (i < 0) continue
        const off = l.cardTexts.length - 1 - i
        votes.set(off, (votes.get(off) ?? 0) + 1)
    }
    const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]
    return best ? best[0] : null
}

/** Link text without CTA words, and without the doubled copy responsive layouts often render. */
export function cleanLinkText(text: string): string {
    let t = text.replace(/\s+/g, " ").trim()
    const words = t.split(" ")
    if (words.length % 2 === 0) {
        const half = words.length / 2
        if (words.slice(0, half).join(" ") === words.slice(half).join(" ")) t = words.slice(0, half).join(" ")
    }
    return t.replace(/\s*(view role|view job|apply now|apply|learn more|read more|see details|details)\s*$/i, "").trim()
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
