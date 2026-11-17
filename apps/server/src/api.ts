import { listJobs, SourceError, type Job, type SourceConfig } from "@syncroles/core"
import { Hono, type Context } from "hono"
import { cors } from "hono/cors"
import type { Db } from "./db.js"
import {
    attachLicence,
    connectSite,
    deleteSite,
    getSite,
    InputError,
    listRuns,
    PUBLISH_MODES,
    runSite,
    SOURCE_KINDS,
    tokenMatches,
    updateSite,
    type FramerGateway,
} from "./sites.js"
import type { PublishMode } from "./framer.js"

export interface ApiDeps {
    db: Db
    framer: FramerGateway
    /** Customer portal link for a site's licence; absent while billing is off. */
    portal?: (siteId: string) => Promise<string | null>
    listJobs?: (config: SourceConfig) => Promise<Job[]>
}

function parseSource(body: any): SourceConfig {
    const kind = body?.kind
    const handle = typeof body?.handle === "string" ? body.handle.trim() : ""
    if (!SOURCE_KINDS.includes(kind)) throw new InputError("Choose one of: Lever, Greenhouse, Ashby, Personio.")
    if (!handle) throw new InputError("Enter your company handle.")
    const options: Record<string, string> = {}
    for (const [k, v] of Object.entries(body?.options ?? {})) {
        if (typeof v === "string" && /^[a-z]{1,20}$/i.test(k) && v.length <= 20) options[k] = v
    }
    return { kind, handle, options }
}

function parsePublishMode(value: unknown): PublishMode {
    if (!PUBLISH_MODES.includes(value as PublishMode)) throw new InputError("Unknown publish mode.")
    return value as PublishMode
}

export function createApi(deps: ApiDeps): Hono {
    const { db, framer } = deps
    const fetchJobs = deps.listJobs ?? (config => listJobs(config))
    const api = new Hono()

    // The plugin runs on Framer's origin and authenticates with a bearer token, never cookies.
    api.use("*", cors({ origin: "*", allowHeaders: ["authorization", "content-type"], allowMethods: ["GET", "POST", "PATCH", "DELETE"] }))

    api.onError((err, c) => {
        if (err instanceof InputError) return c.json({ error: err.message }, 400)
        if (err instanceof SourceError) return c.json({ error: err.message }, 422)
        console.error(`api error ${c.req.method} ${c.req.path} ${err.name}`)
        return c.json({ error: "Something went wrong on our side." }, 500)
    })

    const body = async (c: Context) => {
        try {
            return (await c.req.json()) as any
        } catch {
            throw new InputError("Request body must be JSON.")
        }
    }

    /** Returns the site id once the bearer token is proven to belong to it. */
    const authed = async (c: Context): Promise<string | null> => {
        const id = c.req.param("id") ?? ""
        const token = /^Bearer (.+)$/.exec(c.req.header("authorization") ?? "")?.[1]
        if (!/^[0-9a-f-]{36}$/.test(id) || !token) return null
        return (await tokenMatches(db, id, token)) ? id : null
    }
    const denied = (c: Context) => c.json({ error: "Not connected. Reconnect the project with its API key." }, 401)

    /** Step 1 of onboarding: show what the job board returns before anything is stored or written. */
    api.post("/preview", async c => {
        const jobs = await fetchJobs(parseSource(await body(c)))
        return c.json({
            count: jobs.length,
            jobs: jobs.slice(0, 25).map(j => ({ title: j.title, department: j.department, location: j.location })),
        })
    })

    /** Connect (or reconnect) a project. The first sync is the proof that the key works. */
    api.post("/sites", async c => {
        const b = await body(c)
        const apiKey = typeof b?.apiKey === "string" ? b.apiKey.trim() : ""
        if (!apiKey || apiKey.length > 200) throw new InputError("Paste the Server API key from Site Settings > General.")
        if (typeof b?.projectUrl !== "string") throw new InputError("Paste your Framer project URL.")
        const collectionName = typeof b?.collectionName === "string" && b.collectionName.trim() ? b.collectionName.trim().slice(0, 60) : "Jobs"
        const { site, token } = await connectSite(db, {
            projectUrl: b.projectUrl,
            apiKey,
            source: parseSource(b.source),
            collectionName,
            publishMode: parsePublishMode(b.publishMode ?? "sync-only"),
        })
        const run = await runSite(db, framer, site.id, "manual")
        return c.json({ site: await getSite(db, site.id), token, run }, 201)
    })

    api.get("/sites/:id", async c => {
        const id = await authed(c)
        if (!id) return denied(c)
        return c.json({ site: await getSite(db, id), runs: await listRuns(db, id) })
    })

    api.patch("/sites/:id", async c => {
        const id = await authed(c)
        if (!id) return denied(c)
        const b = await body(c)
        await updateSite(db, id, {
            publishMode: b.publishMode === undefined ? undefined : parsePublishMode(b.publishMode),
            source: b.source === undefined ? undefined : parseSource(b.source),
        })
        return c.json({ site: await getSite(db, id) })
    })

    api.post("/sites/:id/sync", async c => {
        const id = await authed(c)
        if (!id) return denied(c)
        const b = await c.req.json().catch(() => ({}))
        const run = await runSite(db, framer, id, "manual", { allowEmptySource: b?.confirmEmpty === true })
        return c.json({ run, site: await getSite(db, id) })
    })

    api.post("/sites/:id/licence", async c => {
        const id = await authed(c)
        if (!id) return denied(c)
        const b = await body(c)
        if (typeof b?.key !== "string") throw new InputError("Enter your licence key.")
        await attachLicence(db, id, b.key)
        return c.json({ site: await getSite(db, id) })
    })

    api.post("/sites/:id/portal", async c => {
        const id = await authed(c)
        if (!id) return denied(c)
        const url = deps.portal ? await deps.portal(id) : null
        if (!url) throw new InputError("This site has no subscription to manage.")
        return c.json({ url })
    })

    /** Deletes the stored key, settings and run log. */
    api.delete("/sites/:id", async c => {
        const id = await authed(c)
        if (!id) return denied(c)
        await deleteSite(db, id)
        return c.json({ deleted: true })
    })

    return api
}
