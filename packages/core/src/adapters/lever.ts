import { SourceError, type Job, type SourceAdapter } from "../job.js"
import { escapeHtml, getJson, isoDate, remoteFromLocation, safeHandle, str } from "./http.js"

/** https://github.com/lever/postings-api — options.region "eu" uses api.eu.lever.co. */
export const lever: SourceAdapter = {
    kind: "lever",
    async listJobs(config, fetchImpl = fetch) {
        const host = config.options?.region === "eu" ? "api.eu.lever.co" : "api.lever.co"
        const handle = safeHandle(config.handle, "lever")
        const data = await getJson(`https://${host}/v0/postings/${handle}?mode=json`, "lever", fetchImpl)
        if (!Array.isArray(data)) throw new SourceError("Lever returned an unexpected response.", "lever")
        return data.map(toJob).filter((j): j is Job => j !== null)
    },
}

function toJob(p: any): Job | null {
    const id = str(p?.id)
    const title = str(p?.text)
    const jobUrl = str(p?.hostedUrl) ?? str(p?.applyUrl)
    const applyUrl = str(p?.applyUrl) ?? jobUrl
    if (!id || !title || !jobUrl || !applyUrl) return null
    const c = p.categories ?? {}
    const workplace = str(p.workplaceType)?.toLowerCase() ?? null
    const lists: string = Array.isArray(p.lists)
        ? p.lists.map((l: any) => `<h3>${escapeHtml(str(l?.text) ?? "")}</h3><ul>${l?.content ?? ""}</ul>`).join("")
        : ""
    return {
        id,
        title,
        department: str(c.department) ?? str(c.team),
        team: str(c.department) ? str(c.team) : null,
        location: str(c.location),
        employmentType: str(c.commitment),
        isRemote: workplace ? workplace === "remote" : remoteFromLocation(str(c.location)),
        compensation: str(p.salaryDescriptionPlain) ?? salaryRange(p.salaryRange),
        descriptionHtml: `${p.description ?? ""}${lists}${p.additional ?? ""}`,
        jobUrl,
        applyUrl,
        publishedAt: isoDate(p.createdAt),
    }
}

/** Lever's structured range, e.g. { min: 90000, max: 110000, currency: "EUR", interval: "per-year-salary" }. */
function salaryRange(r: any): string | null {
    const min = typeof r?.min === "number" ? r.min : null
    const max = typeof r?.max === "number" ? r.max : null
    if (min === null && max === null) return null
    const currency = str(r.currency) ?? ""
    const amount = (n: number) => `${currency} ${n.toLocaleString("en-US")}`.trim()
    const range = min !== null && max !== null && min !== max ? `${amount(min)} – ${amount(max)}` : amount((min ?? max)!)
    const per = /year/.test(r.interval ?? "") ? " per year" : /month/.test(r.interval ?? "") ? " per month" : /hour/.test(r.interval ?? "") ? " per hour" : ""
    return range + per
}
