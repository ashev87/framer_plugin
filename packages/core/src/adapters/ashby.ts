import { SourceError, type Job, type SourceAdapter } from "../job.js"
import { getJson, isoDate, safeHandle, str } from "./http.js"

const EMPLOYMENT: Record<string, string> = {
    FullTime: "Full-time",
    PartTime: "Part-time",
    Intern: "Internship",
    Contract: "Contract",
    Temporary: "Temporary",
}

/** Ashby public job posting API. Unlisted postings are in the feed and are skipped. */
export const ashby: SourceAdapter = {
    kind: "ashby",
    async listJobs(config, fetchImpl = fetch) {
        const name = safeHandle(config.handle, "ashby")
        const data: any = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${name}`, "ashby", fetchImpl)
        if (!Array.isArray(data?.jobs)) throw new SourceError("Ashby returned an unexpected response.", "ashby")
        return data.jobs
            .filter((p: any) => p?.isListed !== false)
            .map(toJob)
            .filter((j: Job | null): j is Job => j !== null)
    },
}

function toJob(p: any): Job | null {
    const id = str(p?.id)
    const title = str(p?.title)
    const applyUrl = str(p?.applyUrl) ?? str(p?.jobUrl)
    if (!id || !title || !applyUrl) return null
    const type = str(p.employmentType)
    return {
        id,
        title,
        department: str(p.department) ?? str(p.team),
        location: str(p.location),
        employmentType: type ? (EMPLOYMENT[type] ?? type) : null,
        descriptionHtml: typeof p.descriptionHtml === "string" ? p.descriptionHtml : "",
        applyUrl,
        publishedAt: isoDate(p.publishedAt),
    }
}
