import { describe, expect, it } from "vitest"
import { fingerprint, runSync, type Job } from "@syncroles/core"
import { WebflowClient, WebflowCms, WEBFLOW_FIELDS, ensureCollection, toFieldData } from "../src/webflow.js"

const job = (id: string, title = `Job ${id}`): Job => ({
    id,
    title,
    department: "Eng",
    team: null,
    location: "Berlin",
    employmentType: "Full-time",
    isRemote: null,
    compensation: null,
    descriptionHtml: "<p>x</p>",
    jobUrl: `https://jobs.example.com/${id}`,
    applyUrl: `https://jobs.example.com/${id}/apply`,
    publishedAt: null,
})

interface Call {
    method: string
    path: string
    body: any
}

/** In-memory Webflow collection: staged items plus a live flag. */
function fakeWebflow(opts: { sitePublished?: boolean; items?: { id: string; fieldData: any }[] } = {}) {
    const calls: Call[] = []
    const items = new Map<string, { fieldData: any; live: boolean }>((opts.items ?? []).map(i => [i.id, { fieldData: i.fieldData, live: true }]))
    let next = 1
    const fetchImpl = (async (url: string, init: any) => {
        const path = url.replace("https://api.webflow.com/v2", "")
        const body = init.body ? JSON.parse(init.body) : undefined
        calls.push({ method: init.method, path, body })
        const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status })
        const live = path.includes("/items/live")
        if (live && opts.sitePublished === false && init.method !== "GET") {
            return json(409, { message: "Conflict: Conflict with server data: The site is not published." })
        }
        if (init.method === "GET" && path.includes("/items")) {
            const all = [...items].map(([id, v]) => ({ id, fieldData: v.fieldData }))
            return json(200, { items: all, pagination: { total: all.length } })
        }
        if (init.method === "POST" && path.includes("/items")) {
            for (const i of body.items) items.set(`w${next++}`, { fieldData: i.fieldData, live })
            return json(202, {})
        }
        if (init.method === "PATCH") {
            for (const i of body.items) items.set(i.id, { fieldData: i.fieldData, live })
            return json(200, {})
        }
        if (init.method === "DELETE") {
            for (const i of body.items) {
                if (live) items.get(i.id)!.live = false
                else items.delete(i.id)
            }
            return new Response(null, { status: 204 })
        }
        return json(404, {})
    }) as unknown as typeof fetch
    return { calls, items, client: new WebflowClient("t", fetchImpl, async () => {}) }
}

describe("WebflowCms", () => {
    it("creates, updates and removes jobs as live items", async () => {
        const stale = job("old")
        const changed = job("b")
        const wf = fakeWebflow({
            items: [
                { id: "w-old", fieldData: { ...toFieldData(stale) } },
                { id: "w-b", fieldData: { ...toFieldData(changed), "sync-hash": "outdated" } },
                { id: "w-manual", fieldData: { name: "Typed by hand", slug: "hand" } },
            ],
        })
        const cms = new WebflowCms(wf.client, "c1", true)
        const result = await runSync([job("a"), changed], cms)

        expect(result).toMatchObject({ created: 1, updated: 1, removed: 1, foreign: 1 })
        expect(wf.calls.filter(c => c.method !== "GET").map(c => `${c.method} ${c.path}`)).toEqual([
            "POST /collections/c1/items/live",
            "PATCH /collections/c1/items/live",
            "DELETE /collections/c1/items/live",
            "DELETE /collections/c1/items",
        ])
        expect(wf.items.has("w-old")).toBe(false)
        expect(wf.items.has("w-manual")).toBe(true) // never touches items it did not create
        expect(wf.items.get("w-b")!.fieldData["sync-hash"]).toBe(fingerprint(changed))
    })

    it("never uses live endpoints in sync-only mode", async () => {
        const wf = fakeWebflow()
        await runSync([job("a")], new WebflowCms(wf.client, "c1", false))
        expect(wf.calls.some(c => c.path.includes("/live"))).toBe(false)
    })

    it("falls back to staged items when the site was never published", async () => {
        const wf = fakeWebflow({ sitePublished: false })
        const cms = new WebflowCms(wf.client, "c1", true)
        const result = await runSync([job("a"), job("b")], cms)
        expect(result.created).toBe(2)
        expect(cms.fellBackToStaged).toBe(true)
        expect(wf.items.size).toBe(2)
    })

    it("maps a job to stable field slugs with its source id and hash", () => {
        const data = toFieldData(job("x1", "Senior Backend Engineer"))
        expect(data["source-id"]).toBe("x1")
        expect(data.slug).toMatch(/^senior-backend-engineer-/)
        const known = new Set(["name", "slug", ...WEBFLOW_FIELDS.map(f => f.slug)])
        for (const key of Object.keys(data)) expect(known.has(key)).toBe(true)
    })
})

describe("ensureCollection", () => {
    it("creates the collection and adds only missing fields", async () => {
        const calls: Call[] = []
        const fetchImpl = (async (url: string, init: any) => {
            const path = url.replace("https://api.webflow.com/v2", "")
            calls.push({ method: init.method, path, body: init.body ? JSON.parse(init.body) : undefined })
            if (path === "/sites/s1/collections" && init.method === "GET") return new Response(JSON.stringify({ collections: [] }))
            if (path === "/sites/s1/collections") return new Response(JSON.stringify({ id: "c9" }))
            if (path === "/collections/c9" && init.method === "GET") {
                return new Response(JSON.stringify({ fields: [{ slug: "name", type: "PlainText" }, { slug: "location", type: "PlainText" }] }))
            }
            return new Response("{}")
        }) as unknown as typeof fetch
        const id = await ensureCollection(new WebflowClient("t", fetchImpl, async () => {}), "s1", "Jobs")
        expect(id).toBe("c9")
        const added = calls.filter(c => c.path === "/collections/c9/fields").map(c => c.body.displayName)
        expect(added).toHaveLength(WEBFLOW_FIELDS.length - 1)
        expect(added).not.toContain("Location")
    })

    it("retries on 429", async () => {
        let n = 0
        const fetchImpl = (async () => (++n === 1 ? new Response("", { status: 429 }) : new Response(JSON.stringify({ ok: 1 })))) as unknown as typeof fetch
        await expect(new WebflowClient("t", fetchImpl, async () => {}).request("GET", "/x")).resolves.toEqual({ ok: 1 })
        expect(n).toBe(2)
    })
})
