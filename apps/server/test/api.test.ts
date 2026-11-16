import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { SourceError } from "@syncroles/core"
import { createApi } from "../src/api.js"
import { migrate, openDb, type Db } from "../src/db.js"
import type { RunReport, SyncRequest } from "../src/framer.js"
import { dueSites, parseProjectId } from "../src/sites.js"

// Needs a Postgres: set TEST_DATABASE_URL. Skipped otherwise.
const url = process.env.TEST_DATABASE_URL
const d = url ? describe : describe.skip

const PROJECT = "https://framer.com/projects/Enchanted-Biscuits--JwKMyFUt3eTD4s4alfcM-1zmRL?node=x"
const KEY = "3f2b8c1e-aaaa-bbbb-cccc-1234567890ab"
const okReport: RunReport = {
    created: 3, updated: 0, removed: 0, unchanged: 0, foreign: 0, changed: true,
    jobsInSource: 3, published: false, publishSkippedReason: "Publishing is set to manual.", hostnames: [],
}

describe("parseProjectId", () => {
    it("reads the id from the URL forms Framer shows", () => {
        expect(parseProjectId(PROJECT)).toBe("JwKMyFUt3eTD4s4alfcM")
        expect(parseProjectId("https://framer.com/projects/JwKMyFUt3eTD4s4alfcM")).toBe("JwKMyFUt3eTD4s4alfcM")
        expect(parseProjectId("JwKMyFUt3eTD4s4alfcM")).toBe("JwKMyFUt3eTD4s4alfcM")
        expect(parseProjectId("JwKMyFUt3eTD4s4alfcM-1zmRL")).toBe("JwKMyFUt3eTD4s4alfcM")
        expect(() => parseProjectId("https://example.com")).toThrow()
    })
})

d("api", () => {
    let db: Db
    let calls: SyncRequest[]
    let fail: Error | null
    let app: ReturnType<typeof createApi>

    const req = (method: string, path: string, body?: unknown, token?: string) =>
        app.request(path, {
            method,
            headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
        })
    const connect = async () => {
        const res = await req("POST", "/sites", { projectUrl: PROJECT, apiKey: KEY, source: { kind: "lever", handle: "acme" } })
        return { res, json: (await res.json()) as any }
    }

    beforeAll(async () => {
        process.env.SECRETS_KEY = randomBytes(32).toString("base64")
        db = openDb(url!)
        await migrate(db)
        await migrate(db) // idempotent
    })
    afterAll(() => db?.end())
    beforeEach(async () => {
        await db.query("truncate sites, licences, runs cascade")
        calls = []
        fail = null
        app = createApi({
            db,
            framer: { sync: async r => { calls.push(r); if (fail) throw fail; return okReport } },
            listJobs: async c => {
                if (c.handle === "nope") throw new SourceError("No lever job board found for this handle.", "lever", 404)
                return [{ id: "1", title: "Engineer", department: "Eng", location: "Berlin", employmentType: null, descriptionHtml: "", applyUrl: "https://x", publishedAt: null }]
            },
        })
    })

    it("previews a job board and explains an unknown handle", async () => {
        const ok = await req("POST", "/preview", { kind: "lever", handle: "acme" })
        expect(await ok.json()).toEqual({ count: 1, jobs: [{ title: "Engineer", department: "Eng", location: "Berlin" }] })
        const bad = await req("POST", "/preview", { kind: "lever", handle: "nope" })
        expect(bad.status).toBe(422)
        expect(((await bad.json()) as any).error).toMatch(/No lever job board/)
        expect((await req("POST", "/preview", { kind: "workday", handle: "x" })).status).toBe(400)
    })

    it("connects a project, runs the first sync and never stores or returns the key in clear", async () => {
        const { res, json } = await connect()
        expect(res.status).toBe(201)
        expect(json.run).toMatchObject({ status: "ok", created: 3, trigger: "manual" })
        expect(json.site).toMatchObject({ apiKeyHint: "••••90ab", publishMode: "sync-only", scheduled: false })
        expect(JSON.stringify(json)).not.toContain(KEY)
        expect(calls[0]).toMatchObject({ apiKey: KEY, publishMode: "sync-only", collectionName: "Jobs" })
        expect(calls[0]!.projectUrl).not.toContain("?")
        const dump = await db.query("select * from sites")
        expect(JSON.stringify(dump.rows)).not.toContain(KEY)
        expect(JSON.stringify(dump.rows)).not.toContain(json.token)
    })

    it("requires the site token for everything after connecting", async () => {
        const { json } = await connect()
        const path = `/sites/${json.site.id}`
        expect((await req("GET", path)).status).toBe(401)
        expect((await req("GET", path, undefined, "wrong")).status).toBe(401)
        expect((await req("POST", `${path}/sync`, {}, "wrong")).status).toBe(401)
        expect((await req("DELETE", path, undefined, "wrong")).status).toBe(401)
        const ok = await req("GET", path, undefined, json.token)
        expect(((await ok.json()) as any).runs).toHaveLength(1)
    })

    it("reconnecting the same project rotates the token instead of duplicating the site", async () => {
        const first = await connect()
        const second = await connect()
        expect(second.json.site.id).toBe(first.json.site.id)
        expect((await req("GET", `/sites/${first.json.site.id}`, undefined, first.json.token)).status).toBe(401)
        expect((await req("GET", `/sites/${first.json.site.id}`, undefined, second.json.token)).status).toBe(200)
    })

    it("records a failed run with a message the customer can act on", async () => {
        const { json } = await connect()
        fail = Object.assign(new Error(`boom ${KEY}`), { code: "UNAUTHORIZED" })
        const res = await req("POST", `/sites/${json.site.id}/sync`, {}, json.token)
        const out = (await res.json()) as any
        expect(out.run).toMatchObject({ status: "failed" })
        expect(out.run.message).toMatch(/rejected the API key/)
        expect(JSON.stringify(out)).not.toContain(KEY)
    })

    it("changes the publish mode only to a known value", async () => {
        const { json } = await connect()
        const path = `/sites/${json.site.id}`
        expect((await req("PATCH", path, { publishMode: "yolo" }, json.token)).status).toBe(400)
        await req("PATCH", path, { publishMode: "publish-if-clean" }, json.token)
        await req("POST", `${path}/sync`, {}, json.token)
        expect(calls.at(-1)!.publishMode).toBe("publish-if-clean")
    })

    it("schedules only sites with an active licence, within its site limit", async () => {
        const { json } = await connect()
        const path = `/sites/${json.site.id}`
        await db.query("update sites set last_run_at = now() - interval '2 hours'")
        expect(await dueSites(db, 60)).toEqual([])
        expect((await req("POST", `${path}/licence`, { key: "nope" }, json.token)).status).toBe(400)

        await db.query("insert into licences (key, plan, max_sites, expires_at) values ('LIVE', 'site', 1, now() + interval '1 year'), ('OLD', 'site', 1, now() - interval '1 day')")
        expect((await req("POST", `${path}/licence`, { key: "OLD" }, json.token)).status).toBe(400)
        const ok = await req("POST", `${path}/licence`, { key: "LIVE" }, json.token)
        expect(((await ok.json()) as any).site.scheduled).toBe(true)
        expect(await dueSites(db, 60)).toEqual([json.site.id])

        const other = await req("POST", "/sites", { projectUrl: "https://framer.com/projects/Other--AAAAAAAAAAAAAAAAAAAA", apiKey: KEY, source: { kind: "lever", handle: "acme" } })
        const o = (await other.json()) as any
        const full = await req("POST", `/sites/${o.site.id}/licence`, { key: "LIVE" }, o.token)
        expect(full.status).toBe(400)
        expect(((await full.json()) as any).error).toMatch(/limit/)
    })

    it("deletes the site, its key and its run log on request", async () => {
        const { json } = await connect()
        expect((await req("DELETE", `/sites/${json.site.id}`, undefined, json.token)).status).toBe(200)
        expect((await db.query("select count(*)::int as n from sites")).rows[0].n).toBe(0)
        expect((await db.query("select count(*)::int as n from runs")).rows[0].n).toBe(0)
    })
})
