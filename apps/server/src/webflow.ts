import {
    fingerprint,
    listJobs,
    runSync,
    slugFor,
    type CmsPort,
    type ExistingItem,
    type Job,
    type SourceConfig,
    type SyncResult,
} from "@syncroles/core"

/**
 * Webflow destination for the sync engine (Data API v2).
 *
 * Verified on a test site on 21 Nov 2026:
 * - Publishing CMS items one by one does NOT publish other pending site
 *   changes (a staged Home page SEO title stayed unpublished).
 * - Item publishing fails with 409 "The site is not published." until the
 *   site has been published once. Such runs fall back to staged items.
 * - Sites without a CMS plan answer 409 "Upgrade to CMS Hosting to use CMS features."
 *
 * Publish modes:
 * - "sync-only": write staged items; the customer publishes in Webflow.
 * - "publish-jobs": write live items, so only the jobs go live, never the
 *   customer's other unpublished work.
 */
export type WebflowPublishMode = "sync-only" | "publish-jobs"

const API = "https://api.webflow.com/v2"
const BATCH = 100

/** Field slugs never change once shipped: customers' templates are bound to them. */
export const WEBFLOW_FIELDS: { slug: string; displayName: string; type: string; helpText?: string }[] = [
    { slug: "department", displayName: "Department", type: "PlainText" },
    { slug: "team", displayName: "Team", type: "PlainText" },
    { slug: "location", displayName: "Location", type: "PlainText" },
    { slug: "employment-type", displayName: "Employment Type", type: "PlainText" },
    { slug: "remote", displayName: "Remote", type: "Switch" },
    { slug: "compensation", displayName: "Compensation", type: "PlainText" },
    { slug: "description", displayName: "Description", type: "RichText" },
    { slug: "job-url", displayName: "Job URL", type: "Link" },
    { slug: "apply-url", displayName: "Apply URL", type: "Link" },
    { slug: "published-at", displayName: "Published At", type: "DateTime" },
    { slug: "source-id", displayName: "Source ID", type: "PlainText", helpText: "Managed by SyncRoles. Do not edit." },
    { slug: "sync-hash", displayName: "Sync Hash", type: "PlainText", helpText: "Managed by SyncRoles. Do not edit." },
]

export class WebflowApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly body: string
    ) {
        super(message)
        this.name = "WebflowApiError"
    }
    get siteNotPublished(): boolean {
        return this.status === 409 && /site is not published/i.test(this.body)
    }
    get needsCmsPlan(): boolean {
        return this.status === 409 && /upgrade to cms/i.test(this.body)
    }
}

export class WebflowClient {
    constructor(
        private readonly token: string,
        private readonly fetchImpl: typeof fetch = fetch,
        private readonly sleep: (ms: number) => Promise<void> = ms => new Promise(r => setTimeout(r, ms))
    ) {}

    async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        for (let attempt = 1; ; attempt++) {
            const res = await this.fetchImpl(`${API}${path}`, {
                method,
                headers: {
                    authorization: `Bearer ${this.token}`,
                    accept: "application/json",
                    ...(body === undefined ? {} : { "content-type": "application/json" }),
                },
                body: body === undefined ? undefined : JSON.stringify(body),
            })
            if (res.status === 429 && attempt < 5) {
                // Data API allows 60/min (Starter, Basic) or 120/min (CMS and above).
                const retryAfter = Number(res.headers.get("retry-after")) || 2 ** attempt
                await this.sleep(retryAfter * 1000)
                continue
            }
            const text = await res.text()
            if (!res.ok) throw new WebflowApiError(`Webflow ${method} ${path} failed with ${res.status}`, res.status, text)
            return (text ? JSON.parse(text) : {}) as T
        }
    }
}

type ItemFieldData = Record<string, unknown> & { name: string; slug: string }

export function toFieldData(job: Job): ItemFieldData {
    return {
        name: job.title.slice(0, 256),
        slug: slugFor(job),
        department: job.department ?? "",
        team: job.team ?? "",
        location: job.location ?? "",
        "employment-type": job.employmentType ?? "",
        remote: job.isRemote === true,
        compensation: job.compensation ?? "",
        description: job.descriptionHtml,
        "job-url": job.jobUrl,
        "apply-url": job.applyUrl,
        "published-at": job.publishedAt,
        "source-id": job.id,
        "sync-hash": fingerprint(job),
    }
}

/** A Webflow CMS collection as the sync engine sees it. */
export class WebflowCms implements CmsPort {
    /** Set when live writes were refused because the site was never published. */
    fellBackToStaged = false

    constructor(
        private readonly client: WebflowClient,
        private readonly collectionId: string,
        private live: boolean
    ) {}

    private itemsPath(live: boolean) {
        return `/collections/${this.collectionId}/items${live ? "/live" : ""}`
    }

    /** Runs a write live; if the site was never published, switches this run to staged writes. */
    private async write(method: string, body: unknown): Promise<void> {
        if (this.live) {
            try {
                await this.client.request(method, this.itemsPath(true), body)
                return
            } catch (err) {
                if (!(err instanceof WebflowApiError && err.siteNotPublished)) throw err
                this.live = false
                this.fellBackToStaged = true
            }
        }
        await this.client.request(method, this.itemsPath(false), body)
    }

    async listItems(): Promise<ExistingItem[]> {
        const out: ExistingItem[] = []
        for (let offset = 0; ; offset += BATCH) {
            const page = await this.client.request<{ items: { id: string; fieldData: Record<string, unknown> }[]; pagination: { total: number } }>(
                "GET",
                `${this.itemsPath(false)}?limit=${BATCH}&offset=${offset}`
            )
            for (const item of page.items) {
                const sourceId = item.fieldData["source-id"]
                const hash = item.fieldData["sync-hash"]
                out.push({
                    itemId: item.id,
                    sourceId: typeof sourceId === "string" && sourceId ? sourceId : null,
                    fingerprint: typeof hash === "string" && hash ? hash : null,
                })
            }
            if (page.items.length < BATCH || offset + BATCH >= page.pagination.total) return out
        }
    }

    async createItems(jobs: Job[]): Promise<void> {
        for (let i = 0; i < jobs.length; i += BATCH) {
            const items = jobs.slice(i, i + BATCH).map(job => ({ isDraft: false, isArchived: false, fieldData: toFieldData(job) }))
            await this.write("POST", { items })
        }
    }

    async updateItems(updates: { itemId: string; job: Job }[]): Promise<void> {
        for (let i = 0; i < updates.length; i += BATCH) {
            const items = updates.slice(i, i + BATCH).map(u => ({ id: u.itemId, isDraft: false, isArchived: false, fieldData: toFieldData(u.job) }))
            await this.write("PATCH", { items })
        }
    }

    async removeItems(itemIds: string[]): Promise<void> {
        for (let i = 0; i < itemIds.length; i += BATCH) {
            const items = itemIds.slice(i, i + BATCH).map(id => ({ id }))
            if (this.live) {
                // Takes the item off the live site; a never-published item may answer 404, which is fine.
                await this.client.request("DELETE", this.itemsPath(true), { items }).catch(err => {
                    if (!(err instanceof WebflowApiError && (err.status === 404 || err.siteNotPublished))) throw err
                })
            }
            await this.client.request("DELETE", this.itemsPath(false), { items })
        }
    }
}

interface CollectionSummary {
    id: string
    displayName: string
    slug: string
}

/** Finds the jobs collection by name, or creates it; adds any missing SyncRoles fields. */
export async function ensureCollection(client: WebflowClient, siteId: string, name: string): Promise<string> {
    const { collections } = await client.request<{ collections: CollectionSummary[] }>("GET", `/sites/${siteId}/collections`)
    let id = collections.find(c => c.displayName === name)?.id
    if (!id) {
        const created = await client.request<{ id: string }>("POST", `/sites/${siteId}/collections`, {
            displayName: name,
            singularName: name.replace(/s$/i, "") || name,
        })
        id = created.id
    }
    const details = await client.request<{ fields: { slug: string; type: string }[] }>("GET", `/collections/${id}`)
    const have = new Map(details.fields.map(f => [f.slug, f.type]))
    for (const field of WEBFLOW_FIELDS) {
        const type = have.get(field.slug)
        if (type === undefined) {
            await client.request("POST", `/collections/${id}/fields`, { type: field.type, displayName: field.displayName, helpText: field.helpText, isRequired: false })
        } else if (type !== field.type) {
            throw new Error(`The collection "${name}" has a field "${field.slug}" of type ${type}, but SyncRoles needs ${field.type}. Rename that field or pick another collection.`)
        }
    }
    return id
}

export interface WebflowSyncRequest {
    siteId: string
    accessToken: string
    source: SourceConfig
    collectionName: string
    publishMode: WebflowPublishMode
    allowEmptySource?: boolean
}

export interface WebflowRunReport extends SyncResult {
    jobsInSource: number
    published: boolean
    publishSkippedReason: string | null
}

/** One full run. The source is read before Webflow is touched. */
export async function syncToWebflow(req: WebflowSyncRequest, fetchImpl: typeof fetch = fetch): Promise<WebflowRunReport> {
    const jobs = await listJobs(req.source)
    const client = new WebflowClient(req.accessToken, fetchImpl)
    const collectionId = await ensureCollection(client, req.siteId, req.collectionName)
    const cms = new WebflowCms(client, collectionId, req.publishMode === "publish-jobs")
    const result = await runSync(jobs, cms, { allowEmptySource: req.allowEmptySource })

    let publishSkippedReason: string | null = null
    if (result.changed && req.publishMode === "sync-only") publishSkippedReason = "Publishing is set to manual."
    if (cms.fellBackToStaged) {
        publishSkippedReason = "The site has never been published, so the jobs were saved but not published. Publish the site once in Webflow; later runs publish the jobs automatically."
    }
    return {
        ...result,
        jobsInSource: jobs.length,
        published: result.changed && req.publishMode === "publish-jobs" && !cms.fellBackToStaged,
        publishSkippedReason,
    }
}
