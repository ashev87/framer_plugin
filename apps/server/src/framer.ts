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
import { connect, isRetryableError, type Framer, type ManagedCollection, type ManagedCollectionFieldInput } from "framer-api"

/**
 * What the customer chose. Nothing here ever publishes unless they picked it.
 * - "sync-only": write CMS items, never publish.
 * - "publish-if-clean": publish only when the project had no unpublished
 *   changes before this run, so the only thing going live is the jobs sync.
 * - "always-publish": publish after every run that changed something.
 */
export type PublishMode = "sync-only" | "publish-if-clean" | "always-publish"

export const FIELDS: ManagedCollectionFieldInput[] = [
    { id: "title", name: "Title", type: "string" },
    { id: "department", name: "Department", type: "string" },
    { id: "location", name: "Location", type: "string" },
    { id: "employmentType", name: "Employment Type", type: "string" },
    { id: "description", name: "Description", type: "formattedText" },
    { id: "applyUrl", name: "Apply URL", type: "link" },
    { id: "publishedAt", name: "Published", type: "date" },
    // Lets a run skip jobs that have not changed, so an idle hour leaves the project untouched.
    { id: "syncHash", name: "Sync Hash", type: "string" },
]

const BATCH = 100

function toItem(job: Job) {
    return {
        id: job.id,
        slug: slugFor(job),
        fieldData: {
            title: { type: "string" as const, value: job.title },
            department: { type: "string" as const, value: job.department ?? "" },
            location: { type: "string" as const, value: job.location ?? "" },
            employmentType: { type: "string" as const, value: job.employmentType ?? "" },
            description: { type: "formattedText" as const, value: job.descriptionHtml, contentType: "html" as const },
            applyUrl: { type: "link" as const, value: job.applyUrl },
            publishedAt: { type: "date" as const, value: job.publishedAt },
            syncHash: { type: "string" as const, value: fingerprint(job) },
        },
    }
}

/** A Framer managed collection as the sync engine sees it. Item id = source job id. */
export class FramerCms implements CmsPort {
    constructor(
        private readonly framer: Framer,
        private readonly collection: ManagedCollection
    ) {}

    async listItems(): Promise<ExistingItem[]> {
        const ids = await this.collection.getItemIds()
        // ManagedCollection cannot read field values; the plain Collection view of the same node can.
        const plain = await this.framer.getCollection(this.collection.id)
        const hashes = new Map<string, string>()
        for (const item of plain ? await plain.getItems() : []) {
            const entry = item.fieldData["syncHash"]
            // For managed items `id` is the id we supplied in addItems (to confirm in the live spike).
            if (entry && entry.type === "string") hashes.set(item.id, entry.value)
        }
        return ids.map(id => ({ itemId: id, sourceId: id, fingerprint: hashes.get(id) ?? null }))
    }

    async createItems(jobs: Job[]): Promise<void> {
        for (let i = 0; i < jobs.length; i += BATCH) {
            await this.collection.addItems(jobs.slice(i, i + BATCH).map(toItem))
        }
    }

    updateItems(updates: { itemId: string; job: Job }[]): Promise<void> {
        return this.createItems(updates.map(u => u.job)) // addItems upserts by id
    }

    async removeItems(itemIds: string[]): Promise<void> {
        for (let i = 0; i < itemIds.length; i += BATCH) {
            await this.collection.removeItems(itemIds.slice(i, i + BATCH))
        }
    }
}

async function connectWithRetry(projectUrl: string, apiKey: string): Promise<Framer> {
    for (let attempt = 1; ; attempt++) {
        try {
            return await connect(projectUrl, apiKey)
        } catch (err) {
            if (attempt >= 3 || !isRetryableError(err)) throw err
            await new Promise(r => setTimeout(r, attempt * 2000))
        }
    }
}

async function findOrCreateCollection(framer: Framer, name: string): Promise<ManagedCollection> {
    const managed = await framer.getManagedCollections()
    const existing = managed.find(c => c.name === name)
    if (existing) {
        if (existing.managedBy !== "thisPlugin") {
            throw new Error(`The collection "${name}" is managed by another plugin and cannot be synced into.`)
        }
        return existing
    }
    const all = await framer.getCollections()
    if (all.some(c => c.name === name)) {
        throw new Error(`A collection called "${name}" already exists and is not managed by this sync. Pick another name.`)
    }
    return framer.createManagedCollection(name)
}

export interface SyncRequest {
    projectUrl: string
    apiKey: string
    source: SourceConfig
    collectionName: string
    publishMode: PublishMode
    allowEmptySource?: boolean
}

export interface RunReport extends SyncResult {
    jobsInSource: number
    published: boolean
    /** Why a run that changed something did not publish, in words the customer can read. */
    publishSkippedReason: string | null
    hostnames: string[]
}

/**
 * One full run. The source is read before Framer is touched: if the feed is
 * down, the project is never opened and nothing changes.
 */
export async function syncToFramer(req: SyncRequest): Promise<RunReport> {
    const jobs = await listJobs(req.source)

    const framer = await connectWithRetry(req.projectUrl, req.apiKey)
    try {
        // Taken before any write: this is the customer's own unpublished work.
        const pendingBefore = req.publishMode === "publish-if-clean" ? await framer.getUnpublishedPageChanges() : []

        const collection = await findOrCreateCollection(framer, req.collectionName)
        const currentFields = await collection.getFields()
        const sameFields =
            currentFields.length === FIELDS.length && FIELDS.every((f, i) => currentFields[i]?.id === f.id && currentFields[i]?.type === f.type)
        if (!sameFields) await collection.setFields(FIELDS)

        const result = await runSync(jobs, new FramerCms(framer, collection), { allowEmptySource: req.allowEmptySource })
        const report: RunReport = { ...result, jobsInSource: jobs.length, published: false, publishSkippedReason: null, hostnames: [] }

        if (!result.changed && sameFields) return report
        if (req.publishMode === "sync-only") {
            report.publishSkippedReason = "Publishing is set to manual."
            return report
        }
        if (req.publishMode === "publish-if-clean" && pendingBefore.length > 0) {
            const paths = pendingBefore.slice(0, 5).map(c => c.path).join(", ")
            report.publishSkippedReason = `The project has other unpublished changes (${paths}), so the jobs were synced but not published.`
            return report
        }

        const { deployment, hostnames } = await framer.publish()
        const deployed = await framer.deploy(deployment.id)
        report.published = true
        report.hostnames = [...new Set([...hostnames, ...deployed].map(h => h.hostname))]
        return report
    } finally {
        await framer.disconnect().catch(() => {})
    }
}
