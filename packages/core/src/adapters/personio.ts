import { decodeHTML } from "entities"
import { XMLParser } from "fast-xml-parser"
import { SourceError, type Job, type SourceAdapter } from "../job.js"
import { escapeHtml, getText, isoDate, remoteFromLocation, safeHandle, str } from "./http.js"

const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    // Entities are decoded below, for text elements only: CDATA sections hold raw HTML.
    processEntities: false,
    isArray: name => name === "position" || name === "jobDescription",
})

/**
 * Personio XML feed. options.language (de, en, ...) picks the feed language;
 * options.domain "com" uses <company>.jobs.personio.com.
 */
export const personio: SourceAdapter = {
    kind: "personio",
    async listJobs(config, fetchImpl = fetch) {
        const company = safeHandle(config.handle, "personio")
        const tld = config.options?.domain === "com" ? "com" : "de"
        const language = config.options?.language
        const base = `https://${company}.jobs.personio.${tld}`
        const query = language && /^[a-z]{2}$/.test(language) ? `?language=${language}` : ""
        const xml = await getText(`${base}/xml${query}`, "personio", fetchImpl, "application/xml")
        // An HTML error page or a truncated body must never read as "no jobs".
        if (!/<workzag-jobs[\s/>]/.test(xml) || !/(<\/workzag-jobs>|<workzag-jobs\s*\/>)\s*$/.test(xml)) {
            throw new SourceError("Personio did not return a complete XML feed. Is the XML feed enabled?", "personio")
        }
        let root: any
        try {
            root = parser.parse(xml)
        } catch {
            throw new SourceError("Personio returned XML that could not be read.", "personio")
        }
        const positions: any[] = root?.["workzag-jobs"]?.position ?? []
        return positions.map(p => toJob(p, base, query)).filter((j): j is Job => j !== null)
    },
}

/** Text element: XML-escaped plain text, e.g. "R&amp;D" or "you&#039;ll". */
function text(value: unknown): string | null {
    const v = str(value)
    return v === null ? null : decodeHTML(v)
}

const SCHEDULE: Record<string, string> = { "full-time": "Full-time", "part-time": "Part-time" }

function toJob(p: any, base: string, query: string): Job | null {
    const id = str(p?.id)
    const title = text(p?.name)
    if (!id || !title) return null
    const sections: any[] = p.jobDescriptions?.jobDescription ?? []
    const descriptionHtml = sections
        .map(s => `<h3>${escapeHtml(text(s?.name) ?? "")}</h3>${typeof s?.value === "string" ? s.value : ""}`)
        .join("")
    const schedule = str(p.schedule)
    const location = text(p.office)
    const jobUrl = `${base}/job/${id}${query}`
    return {
        id,
        title,
        department: text(p.department) ?? text(p.recruitingCategory),
        team: null,
        location,
        employmentType: schedule ? (SCHEDULE[schedule] ?? schedule) : str(p.employmentType),
        isRemote: remoteFromLocation(location),
        compensation: null,
        descriptionHtml,
        jobUrl,
        applyUrl: jobUrl,
        publishedAt: isoDate(p.createdAt),
    }
}
