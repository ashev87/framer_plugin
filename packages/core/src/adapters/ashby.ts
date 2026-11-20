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
        const data: any = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${name}?includeCompensation=true`, "ashby", fetchImpl)
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
    const jobUrl = str(p?.jobUrl) ?? str(p?.applyUrl)
    const applyUrl = str(p?.applyUrl) ?? jobUrl
    if (!id || !title || !jobUrl || !applyUrl) return null
    const type = str(p.employmentType)
    const department = str(p.department)
    return {
        id,
        title,
        department: department ?? str(p.team),
        team: department ? str(p.team) : null,
        location: str(p.location),
        employmentType: type ? (EMPLOYMENT[type] ?? type) : null,
        isRemote: typeof p.isRemote === "boolean" ? p.isRemote : null,
        compensation: compensation(p),
        descriptionHtml: typeof p.descriptionHtml === "string" ? p.descriptionHtml : "",
        jobUrl,
        applyUrl,
        publishedAt: isoDate(p.publishedAt),
    }
}

/** Only what the company chose to show on its own job posts. */
function compensation(p: any): string | null {
    if (p?.shouldDisplayCompensationOnJobPostings !== true) return null
    const c = p.compensation
    return str(c?.scrapeableCompensationSalarySummary) ?? str(c?.compensationTierSummary)
}
