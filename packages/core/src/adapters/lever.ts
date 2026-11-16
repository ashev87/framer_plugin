import { SourceError, type Job, type SourceAdapter } from "../job.js"
import { escapeHtml, getJson, isoDate, safeHandle, str } from "./http.js"

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
    const applyUrl = str(p?.applyUrl) ?? str(p?.hostedUrl)
    if (!id || !title || !applyUrl) return null
    const c = p.categories ?? {}
    const lists: string = Array.isArray(p.lists)
        ? p.lists.map((l: any) => `<h3>${escapeHtml(str(l?.text) ?? "")}</h3><ul>${l?.content ?? ""}</ul>`).join("")
        : ""
    return {
        id,
        title,
        department: str(c.department) ?? str(c.team),
        location: str(c.location),
        employmentType: str(c.commitment),
        descriptionHtml: `${p.description ?? ""}${lists}${p.additional ?? ""}`,
        applyUrl,
        publishedAt: isoDate(p.createdAt),
    }
}
