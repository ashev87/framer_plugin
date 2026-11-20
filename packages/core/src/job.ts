import { createHash } from "node:crypto"

/** One normalised job posting, whatever ATS it came from. */
export interface Job {
    /** Stable id in the source ATS. The sync engine diffs on this. */
    id: string
    title: string
    department: string | null
    /** Sub-group of the department, where the ATS has one (Ashby, Lever). */
    team: string | null
    location: string | null
    employmentType: string | null
    /** True or false when the source says so; null when it does not. */
    isRemote: boolean | null
    /** Pay range as the company publishes it, e.g. "$120K – $150K". Null when not shown. */
    compensation: string | null
    /** Sanitised-by-source HTML. */
    descriptionHtml: string
    /** Public job description page. */
    jobUrl: string
    /** Application form; the job page itself when the ATS has no separate form. */
    applyUrl: string
    /** ISO 8601, or null when the source does not expose it. */
    publishedAt: string | null
}

export type SourceKind = "lever" | "greenhouse" | "ashby" | "personio"

export interface SourceConfig {
    kind: SourceKind
    /** Company handle / board token / subdomain, as the ATS calls it. */
    handle: string
    /** Source-specific options (e.g. Lever region, Personio language). */
    options?: Record<string, string>
}

export interface SourceAdapter {
    kind: SourceKind
    listJobs(config: SourceConfig, fetchImpl?: typeof fetch): Promise<Job[]>
}

/** Thrown when a source cannot be read. A sync run must change nothing after this. */
export class SourceError extends Error {
    constructor(
        message: string,
        readonly kind: SourceKind,
        readonly status?: number
    ) {
        super(message)
        this.name = "SourceError"
    }
}

/**
 * Content fingerprint stored next to each CMS item, so an unchanged job
 * costs no write. Field order is fixed here, not taken from the object.
 */
export function fingerprint(job: Job): string {
    const canonical = JSON.stringify([
        job.id,
        job.title,
        job.department,
        job.team,
        job.location,
        job.employmentType,
        job.isRemote,
        job.compensation,
        job.descriptionHtml,
        job.jobUrl,
        job.applyUrl,
        job.publishedAt,
    ])
    return createHash("sha256").update(canonical).digest("hex").slice(0, 32)
}

/** URL slug for a job: readable title plus the source id, so it is unique and stable. */
export function slugFor(job: Job): string {
    const base = job.title
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
    const idPart = job.id
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(-12)
    return [base, idPart].filter(Boolean).join("-") || "job"
}
