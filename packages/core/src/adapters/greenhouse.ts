import { decodeHTML } from "entities"
import { SourceError, type Job, type SourceAdapter } from "../job.js"
import { getJson, isoDate, remoteFromLocation, safeHandle, str } from "./http.js"

/** Greenhouse Job Board API. `content` arrives HTML-entity-escaped. */
export const greenhouse: SourceAdapter = {
    kind: "greenhouse",
    async listJobs(config, fetchImpl = fetch) {
        const token = safeHandle(config.handle, "greenhouse")
        // Greenhouse hosts boards in a US and an EU region; the token does not say which.
        // options.region "eu" asks the EU API first, otherwise the US API, and a 404 falls back to the other.
        const hosts = config.options?.region === "eu"
            ? ["boards-api.eu.greenhouse.io", "boards-api.greenhouse.io"]
            : ["boards-api.greenhouse.io", "boards-api.eu.greenhouse.io"]
        let data: any
        for (const [i, host] of hosts.entries()) {
            try {
                data = await getJson(`https://${host}/v1/boards/${token}/jobs?content=true`, "greenhouse", fetchImpl)
                break
            } catch (err) {
                if (i === 0 && err instanceof SourceError && err.status === 404) continue
                throw err
            }
        }
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
    const jobUrl = str(p?.absolute_url)
    if (!id || !title || !jobUrl) return null
    const meta = Array.isArray(p.metadata) ? p.metadata : []
    const location = str(p.location?.name)
    const employment = meta.find((m: any) => /employment|job type|commitment/i.test(m?.name ?? ""))
    return {
        id,
        title,
        department: str(p.departments?.[0]?.name),
        team: null,
        location,
        employmentType: str(employment?.value),
        isRemote: remoteFromLocation(location),
        compensation: null,
        descriptionHtml: decodeHTML(typeof p.content === "string" ? p.content : ""),
        jobUrl,
        // Greenhouse shows the application form on the job page itself.
        applyUrl: jobUrl,
        publishedAt: isoDate(p.first_published ?? p.updated_at),
    }
}
