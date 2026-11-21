import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { Hono } from "hono"
import { createApi } from "../src/api.js"
import { migrate, openDb, type Db } from "../src/db.js"
import { decryptSecret } from "../src/secrets.js"
import { runSite, type FramerGateway } from "../src/sites.js"
import { WebflowApiError, type WebflowRunReport, type WebflowSyncRequest } from "../src/webflow.js"
import { authorizeUrl, createWebflowRoutes, type WebflowAppConfig } from "../src/webflow-oauth.js"

const config: WebflowAppConfig = { clientId: "cid", clientSecret: "csecret", redirectUri: "https://syncroles.com/webflow/callback" }

describe("authorizeUrl", () => {
    it("asks only for sites and CMS scopes and carries state", () => {
        const url = new URL(authorizeUrl(config, "st4te"))
        expect(url.origin + url.pathname).toBe("https://webflow.com/oauth/authorize")
        expect(url.searchParams.get("scope")).toBe("sites:read cms:read cms:write")
        expect(url.searchParams.get("state")).toBe("st4te")
        expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri)
        expect(authorizeUrl(config, "x")).not.toContain("+")
    })
})

const url = process.env.TEST_DATABASE_URL
const d = url ? describe : describe.skip

d("Webflow app routes", () => {
    let db: Db
    let app: Hono
    let syncCalls: WebflowSyncRequest[]
    let syncError: Error | null
    let revoked: string[]
    const report: WebflowRunReport = { created: 2, updated: 0, removed: 0, unchanged: 0, foreign: 0, changed: true, jobsInSource: 2, published: true, publishSkippedReason: null }

    const fakeFetch = (async (input: string, init?: any) => {
        if (input === "https://api.webflow.com/oauth/access_token") {
            const body = JSON.parse(init.body)
            if (body.code !== "good-code" || body.client_secret !== "csecret") return new Response("{}", { status: 400 })
            return new Response(JSON.stringify({ access_token: "wf-token-123", token_type: "bearer" }))
        }
        if (input === "https://api.webflow.com/v2/sites") {
            return new Response(JSON.stringify({ sites: [{ id: "site-a", displayName: "Acme", shortName: "acme" }, { id: "site-b", displayName: "Beta", shortName: "beta" }] }))
        }
        if (input === "https://webflow.com/oauth/revoke_authorization") {
            revoked.push(JSON.parse(init.body).access_token)
            return new Response(JSON.stringify({ did_revoke: true }))
        }
        return new Response("{}", { status: 404 })
    }) as unknown as typeof fetch

    const gateway: FramerGateway = {
        sync: async () => { throw new Error("not used") },
        syncWebflow: async r => { syncCalls.push(r); if (syncError) throw syncError; return report },
    }

    /** Runs the OAuth dance and returns the setup token from the redirect fragment. */
    const install = async () => {
        const res = await app.request("/webflow/install")
        expect(res.status).toBe(302)
        const state = new URL(res.headers.get("location")!).searchParams.get("state")!
        const cookie = res.headers.get("set-cookie")!.split(";")[0]
        const cb = await app.request(`/webflow/callback?code=good-code&state=${state}`, { headers: { cookie } })
        expect(cb.status).toBe(302)
        const loc = cb.headers.get("location")!
        expect(loc).toMatch(/^\/webflow\/setup#setup=/)
        return loc.split("#setup=")[1]!
    }
    const post = (path: string, token: string, body: unknown) =>
        app.request(path, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) })
    const setup = async (token: string, siteId = "site-a") => {
        const res = await post("/webflow/api/sites", token, { siteId, source: { kind: "ashby", handle: "acme" }, publishMode: "publish-jobs" })
        return { res, json: (await res.json()) as any }
    }

    beforeAll(async () => {
        process.env.SECRETS_KEY = randomBytes(32).toString("base64")
        db = openDb(url!)
        await migrate(db)
        await migrate(db)
    })
    afterAll(() => db?.end())
    beforeEach(async () => {
        await db.query("truncate sites, licences, runs, webflow_pending cascade")
        syncCalls = []
        syncError = null
        revoked = []
        app = new Hono()
        app.route("/", createWebflowRoutes({ db, gateway, config, fetchImpl: fakeFetch, listJobs: async () => [] }))
        app.route("/api", createApi({ db, framer: gateway }))
    })

    it("sends people to 'coming soon' while the app is not configured", async () => {
        const off = createWebflowRoutes({ db, gateway, config: null })
        const res = await off.request("/webflow/install")
        expect(res.headers.get("location")).toBe("/webflow?status=soon")
    })

    it("rejects a callback whose state does not match the cookie", async () => {
        const res = await app.request("/webflow/callback?code=good-code&state=forged", { headers: { cookie: "wf_oauth_state=other" } })
        expect(res.headers.get("location")).toBe("/webflow?status=expired")
        expect((await db.query("select count(*)::int as n from webflow_pending")).rows[0].n).toBe(0)
    })

    it("stores the token encrypted, lists the authorised sites, and sets up a site with a first sync", async () => {
        const setupToken = await install()
        const pending = (await db.query("select * from webflow_pending")).rows[0]
        expect(pending.access_token_enc).not.toContain("wf-token-123")
        expect(decryptSecret(pending.access_token_enc)).toBe("wf-token-123")

        const list = await app.request("/webflow/api/pending", { headers: { authorization: `Bearer ${setupToken}` } })
        expect(((await list.json()) as any).sites.map((s: any) => s.name)).toEqual(["Acme", "Beta"])

        const { res, json } = await setup(setupToken)
        expect(res.status).toBe(201)
        expect(json.site).toMatchObject({ platform: "webflow", siteName: "Acme", publishMode: "publish-jobs", disconnected: false })
        expect(syncCalls[0]).toMatchObject({ siteId: "site-a", accessToken: "wf-token-123", collectionName: "Jobs", publishMode: "publish-jobs" })

        // The management token works on the shared site API, and Framer-only modes are refused.
        const view = await app.request(`/api/sites/${json.site.id}`, { headers: { authorization: `Bearer ${json.token}` } })
        expect(((await view.json()) as any).runs[0]).toMatchObject({ status: "ok", created: 2, published: true })
        const bad = await app.request(`/api/sites/${json.site.id}`, {
            method: "PATCH", headers: { authorization: `Bearer ${json.token}`, "content-type": "application/json" }, body: JSON.stringify({ publishMode: "always-publish" }),
        })
        expect(bad.status).toBe(400)
    })

    it("refuses a site the user did not authorise and an unknown setup token", async () => {
        const setupToken = await install()
        expect((await setup(setupToken, "site-z")).res.status).toBe(400)
        expect((await setup("not-a-token")).res.status).toBe(401)
    })

    it("deletes the token when Webflow answers 401, and stops scheduling the site", async () => {
        const { json } = await setup(await install())
        syncError = new WebflowApiError("revoked", 401, "{}")
        const run = await runSite(db, gateway, json.site.id, "manual")
        expect(run.status).toBe("failed")
        expect(run.message).toContain("Connect it again")
        const row = (await db.query("select api_key_enc, disconnected_at from sites where id = $1", [json.site.id])).rows[0]
        expect(row.api_key_enc).toBe("")
        expect(row.disconnected_at).not.toBeNull()
    })

    it("revokes on disconnect only when no other site shares the authorisation", async () => {
        const setupToken = await install()
        const a = (await setup(setupToken, "site-a")).json
        const b = (await setup(setupToken, "site-b")).json
        const del = (s: any) => app.request(`/webflow/api/sites/${s.site.id}`, { method: "DELETE", headers: { authorization: `Bearer ${s.token}` } })

        expect((await del(a)).status).toBe(200)
        expect(revoked).toEqual([]) // site-b still uses the token
        expect((await del(b)).status).toBe(200)
        expect(revoked).toEqual(["wf-token-123"])
        expect((await db.query("select count(*)::int as n from sites")).rows[0].n).toBe(0)
    })

    it("refuses disconnect with a wrong management token", async () => {
        const { json } = await setup(await install())
        const res = await app.request(`/webflow/api/sites/${json.site.id}`, { method: "DELETE", headers: { authorization: "Bearer wrong" } })
        expect(res.status).toBe(401)
    })
})
