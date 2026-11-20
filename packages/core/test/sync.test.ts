import { describe, expect, it } from "vitest"
import { fingerprint, slugFor, type Job } from "../src/job.js"
import { planSync, runSync, SyncAbortedError, type CmsPort, type ExistingItem } from "../src/sync.js"

function job(id: string, over: Partial<Job> = {}): Job {
    return {
        id,
        title: `Role ${id}`,
        department: "Engineering",
        team: null,
        location: "Berlin",
        employmentType: "Full-time",
        isRemote: null,
        compensation: null,
        descriptionHtml: "<p>Hello</p>",
        jobUrl: `https://example.com/jobs/${id}`,
        applyUrl: `https://example.com/apply/${id}`,
        publishedAt: "2026-11-01T00:00:00.000Z",
        ...over,
    }
}

class FakeCms implements CmsPort {
    items = new Map<string, { sourceId: string | null; fingerprint: string | null }>()
    writes = 0
    private next = 1
    seed(sourceId: string | null, fp: string | null) {
        const itemId = `item${this.next++}`
        this.items.set(itemId, { sourceId, fingerprint: fp })
        return itemId
    }
    async listItems(): Promise<ExistingItem[]> {
        return [...this.items].map(([itemId, v]) => ({ itemId, ...v }))
    }
    async createItems(jobs: Job[]) {
        this.writes++
        for (const j of jobs) this.seed(j.id, fingerprint(j))
    }
    async updateItems(updates: { itemId: string; job: Job }[]) {
        this.writes++
        for (const u of updates) this.items.set(u.itemId, { sourceId: u.job.id, fingerprint: fingerprint(u.job) })
    }
    async removeItems(ids: string[]) {
        this.writes++
        for (const id of ids) this.items.delete(id)
    }
}

describe("planSync", () => {
    it("creates, updates, removes and leaves unchanged jobs alone", () => {
        const a = job("a")
        const b = job("b")
        const existing: ExistingItem[] = [
            { itemId: "1", sourceId: "a", fingerprint: fingerprint(a) },
            { itemId: "2", sourceId: "b", fingerprint: "stale" },
            { itemId: "3", sourceId: "gone", fingerprint: "x" },
        ]
        const plan = planSync([a, b, job("c")], existing)
        expect(plan.create.map(j => j.id)).toEqual(["c"])
        expect(plan.update.map(u => u.itemId)).toEqual(["2"])
        expect(plan.remove).toEqual(["3"])
        expect(plan.unchanged).toBe(1)
    })

    it("never touches items it did not create", () => {
        const plan = planSync([job("a")], [{ itemId: "manual", sourceId: null, fingerprint: null }])
        expect(plan.remove).toEqual([])
        expect(plan.foreign).toBe(1)
    })

    it("removes duplicate items for the same source id and ignores duplicate source jobs", () => {
        const a = job("a")
        const plan = planSync(
            [a, a],
            [
                { itemId: "1", sourceId: "a", fingerprint: fingerprint(a) },
                { itemId: "2", sourceId: "a", fingerprint: fingerprint(a) },
            ]
        )
        expect(plan.remove).toEqual(["2"])
        expect(plan.create).toEqual([])
        expect(plan.unchanged).toBe(1)
    })
})

describe("runSync", () => {
    it("is idempotent: a second run writes nothing", async () => {
        const cms = new FakeCms()
        const jobs = [job("a"), job("b")]
        const first = await runSync(jobs, cms)
        expect(first).toMatchObject({ created: 2, changed: true })
        const writes = cms.writes
        const second = await runSync(jobs, cms)
        expect(second).toMatchObject({ created: 0, updated: 0, removed: 0, unchanged: 2, changed: false })
        expect(cms.writes).toBe(writes)
    })

    it("removes closed roles", async () => {
        const cms = new FakeCms()
        await runSync([job("a"), job("b")], cms)
        const result = await runSync([job("a")], cms)
        expect(result.removed).toBe(1)
        expect([...cms.items.values()].map(i => i.sourceId)).toEqual(["a"])
    })

    it("aborts without writing when the source is suddenly empty", async () => {
        const cms = new FakeCms()
        await runSync([job("a")], cms)
        const writes = cms.writes
        await expect(runSync([], cms)).rejects.toBeInstanceOf(SyncAbortedError)
        expect(cms.writes).toBe(writes)
        expect(cms.items.size).toBe(1)
    })

    it("empties the collection when the empty source is confirmed", async () => {
        const cms = new FakeCms()
        await runSync([job("a")], cms)
        const result = await runSync([], cms, { allowEmptySource: true })
        expect(result.removed).toBe(1)
    })
})

describe("slugFor", () => {
    it("is readable, ascii and unique per id", () => {
        expect(slugFor(job("abc-123", { title: "Senior Ingénieur (m/w/d) – Köln" }))).toBe(
            "senior-ingenieur-m-w-d-koln-abc123"
        )
        expect(slugFor(job("1", { title: "Dev" }))).not.toBe(slugFor(job("2", { title: "Dev" })))
    })
})
