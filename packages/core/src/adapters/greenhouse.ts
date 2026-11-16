import { decodeHTML } from "entities"
import { SourceError, type Job, type SourceAdapter } from "../job.js"
import { getJson, isoDate, safeHandle, str } from "./http.js"

/** Greenhouse Job Board API. `content` arrives HTML-entity-escaped. */
export const greenhouse: SourceAdapter = {
    kind: "greenhouse",
    async listJobs(config, fetchImpl = fetch) {
        const token = safeHandle(config.handle, "greenhouse")
        const data: any = await getJson(
            `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
            "greenhouse",
            fetchImpl
        )
        if (!Array.isArray(data?.jobs)) throw new SourceError("Greenhouse returned an unexpected response.", "greenhouse")
        const total = data.meta?.total
        if (typeof total === "number" && total !== data.jobs.length) {
            throw new SourceError(`Greenhouse returned ${data.jobs.length} of ${total} jobs.`, "greenhouse")
        }
        return data.jobs.map(toJob).filter((j: Job | null): j is Job => j !== null)
    },
}

function toJob(p: any): Job | null {
    const id = str(p?.id)
    const title = str(p?.title)
    const applyUrl = str(p?.absolute_url)
    if (!id || !title || !applyUrl) return null
    const meta = Array.isArray(p.metadata) ? p.metadata : []
    const employment = meta.find((m: any) => /employment|job type|commitment/i.test(m?.name ?? ""))
    return {
        id,
        title,
        department: str(p.departments?.[0]?.name),
        location: str(p.location?.name),
        employmentType: str(employment?.value),
        descriptionHtml: decodeHTML(typeof p.content === "string" ? p.content : ""),
        applyUrl,
        publishedAt: isoDate(p.first_published ?? p.updated_at),
    }
}
