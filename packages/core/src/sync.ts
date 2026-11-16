import { fingerprint, type Job } from "./job.js"

/** What the engine needs to know about an item already in the CMS collection. */
export interface ExistingItem {
    /** The CMS's own item id. */
    itemId: string
    /** Source job id we stored on the item. Null for items we did not create. */
    sourceId: string | null
    fingerprint: string | null
}

/** The CMS side of a sync. Implemented for Framer; faked in tests. */
export interface CmsPort {
    listItems(): Promise<ExistingItem[]>
    createItems(jobs: Job[]): Promise<void>
    updateItems(updates: { itemId: string; job: Job }[]): Promise<void>
    removeItems(itemIds: string[]): Promise<void>
}

export interface SyncPlan {
    create: Job[]
    update: { itemId: string; job: Job }[]
    remove: string[]
    unchanged: number
    /** Items in the collection without a source id: never touched. */
    foreign: number
}

export function planSync(jobs: Job[], existing: ExistingItem[]): SyncPlan {
    const bySourceId = new Map<string, ExistingItem>()
    const duplicates: string[] = []
    let foreign = 0
    for (const item of existing) {
        if (item.sourceId === null) {
            foreign++
        } else if (bySourceId.has(item.sourceId)) {
            duplicates.push(item.itemId)
        } else {
            bySourceId.set(item.sourceId, item)
        }
    }

    const plan: SyncPlan = { create: [], update: [], remove: [...duplicates], unchanged: 0, foreign }
    const seen = new Set<string>()
    for (const job of jobs) {
        if (seen.has(job.id)) continue
        seen.add(job.id)
        const item = bySourceId.get(job.id)
        if (!item) plan.create.push(job)
        else if (item.fingerprint !== fingerprint(job)) plan.update.push({ itemId: item.itemId, job })
        else plan.unchanged++
    }
    for (const [sourceId, item] of bySourceId) {
        if (!seen.has(sourceId)) plan.remove.push(item.itemId)
    }
    return plan
}

export class SyncAbortedError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "SyncAbortedError"
    }
}

export interface SyncOptions {
    /**
     * A source that suddenly returns nothing is far more often an outage or a
     * renamed board than a company closing every role at once. Unless this is
     * set, an empty source with a non-empty collection aborts the run.
     */
    allowEmptySource?: boolean
}

export interface SyncResult {
    created: number
    updated: number
    removed: number
    unchanged: number
    foreign: number
    changed: boolean
}

/**
 * Apply source jobs to the CMS. The source has already been read successfully
 * by the caller; nothing is written until the whole plan is known.
 * Order is create, update, remove: a failure part-way leaves extra or stale
 * jobs (fixed by the next run) rather than a careers page missing open roles.
 */
export async function runSync(jobs: Job[], cms: CmsPort, options: SyncOptions = {}): Promise<SyncResult> {
    const existing = await cms.listItems()
    const ours = existing.filter(i => i.sourceId !== null).length
    if (jobs.length === 0 && ours > 0 && !options.allowEmptySource) {
        throw new SyncAbortedError(
            `Source returned 0 jobs but the collection has ${ours}. Nothing was changed. ` +
                `If every role really is closed, confirm the empty sync.`
        )
    }

    const plan = planSync(jobs, existing)
    if (plan.create.length) await cms.createItems(plan.create)
    if (plan.update.length) await cms.updateItems(plan.update)
    if (plan.remove.length) await cms.removeItems(plan.remove)

    return {
        created: plan.create.length,
        updated: plan.update.length,
        removed: plan.remove.length,
        unchanged: plan.unchanged,
        foreign: plan.foreign,
        changed: plan.create.length + plan.update.length + plan.remove.length > 0,
    }
}
