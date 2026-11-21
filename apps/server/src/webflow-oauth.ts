import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { listJobs, SourceError, type Job, type SourceConfig } from "@syncroles/core"
import { Hono, type Context } from "hono"
import { getCookie, setCookie, deleteCookie } from "hono/cookie"
import type { Db } from "./db.js"
import { decryptSecret, encryptSecret } from "./secrets.js"
import { getSite, InputError, runSite, SOURCE_KINDS, WEBFLOW_PUBLISH_MODES, type FramerGateway } from "./sites.js"
import { WebflowClient, type WebflowPublishMode } from "./webflow.js"

/**
 * Webflow Data Client app: OAuth install, the setup form's API, and disconnect.
 *
 * Flow: /webflow/install -> Webflow consent -> /webflow/callback (code exchanged,
 * token encrypted into webflow_pending) -> /webflow/setup#<setup token> -> the
 * setup form picks a site and job board -> POST /webflow/api/sites creates the
 * site, runs the first sync and returns the site's management token.
 *
 * The OAuth token is encrypted at rest, kept server-side only, and deleted on
 * disconnect or when Webflow answers 401 (revoked or uninstalled).
 */
export interface WebflowAppConfig {
    clientId: string
    clientSecret: string
    /** Must match the redirect URI registered for the app. */
    redirectUri: string
    /** False until Webflow approves the app: only ?preview=1 reaches OAuth, everyone else sees "coming soon". */
    open?: boolean
}

export const WEBFLOW_SCOPES = ["sites:read", "cms:read", "cms:write"]
const STATE_COOKIE = "wf_oauth_state"
const PENDING_TTL_MINUTES = 60

const hash = (s: string) => createHash("sha256").update(s).digest("hex")

export function authorizeUrl(config: WebflowAppConfig, state: string): string {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: WEBFLOW_SCOPES.join(" "),
        state,
    })
    return `https://webflow.com/oauth/authorize?${params.toString().replace(/\+/g, "%20")}`
}

export async function exchangeCode(config: WebflowAppConfig, code: string, fetchImpl: typeof fetch = fetch): Promise<string> {
    const res = await fetchImpl("https://api.webflow.com/oauth/access_token", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: config.redirectUri,
        }),
    })
    const data = (await res.json().catch(() => ({}))) as { access_token?: string }
    if (!res.ok || !data.access_token) throw new Error(`Webflow token exchange failed with ${res.status}`)
    return data.access_token
}

export async function revokeToken(config: WebflowAppConfig, accessToken: string, fetchImpl: typeof fetch = fetch): Promise<void> {
    await fetchImpl("https://webflow.com/oauth/revoke_authorization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, access_token: accessToken }),
    })
}

export interface WebflowDeps {
    db: Db
    gateway: FramerGateway
    config: WebflowAppConfig | null
    fetchImpl?: typeof fetch
    listJobs?: (config: SourceConfig) => Promise<Job[]>
}

function parseSource(body: any): SourceConfig {
    const kind = body?.kind
    const handle = typeof body?.handle === "string" ? body.handle.trim() : ""
    if (!SOURCE_KINDS.includes(kind)) throw new InputError("Choose one of: Lever, Greenhouse, Ashby, Personio.")
    if (!handle || handle.length > 100) throw new InputError("Enter your company handle.")
    const options: Record<string, string> = {}
    for (const [k, v] of Object.entries(body?.options ?? {})) {
        if (typeof v === "string" && /^[a-z]{1,20}$/i.test(k) && v.length <= 20) options[k] = v
    }
    return { kind, handle, options }
}

export function createWebflowRoutes(deps: WebflowDeps): Hono {
    const { db, gateway, config } = deps
    const fetchImpl = deps.fetchImpl ?? fetch
    const fetchJobs = deps.listJobs ?? (c => listJobs(c))
    const app = new Hono()

    app.onError((err, c) => {
        if (err instanceof InputError) return c.json({ error: err.message }, 400)
        if (err instanceof SourceError) return c.json({ error: err.message }, 422)
        console.error(`webflow route error ${c.req.method} ${c.req.path} ${err.name}`)
        return c.json({ error: "Something went wrong on our side." }, 500)
    })

    const notReady = (c: Context) => c.redirect("/webflow?status=soon", 302)

    app.get("/webflow/install", c => {
        if (!config) return notReady(c)
        // Before approval only the developer's own workspace can install, so the public button stays closed.
        if (config.open === false && c.req.query("preview") !== "1") return notReady(c)
        const state = randomBytes(24).toString("base64url")
        setCookie(c, STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "Lax", path: "/webflow", maxAge: 600 })
        return c.redirect(authorizeUrl(config, state), 302)
    })

    app.get("/webflow/callback", async c => {
        if (!config) return notReady(c)
        const expected = getCookie(c, STATE_COOKIE) ?? ""
        const state = c.req.query("state") ?? ""
        deleteCookie(c, STATE_COOKIE, { path: "/webflow" })
        const a = Buffer.from(expected)
        const b = Buffer.from(state)
        if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return c.redirect("/webflow?status=expired", 302)
        const code = c.req.query("code")
        if (!code) return c.redirect("/webflow?status=cancelled", 302)

        let accessToken: string
        try {
            accessToken = await exchangeCode(config, code, fetchImpl)
        } catch (err) {
            console.error(`webflow token exchange failed ${(err as Error).message}`)
            return c.redirect("/webflow?status=failed", 302)
        }
        const { sites } = await new WebflowClient(accessToken, fetchImpl).request<{ sites: { id: string; displayName: string; shortName: string }[] }>("GET", "/sites")
        const setupToken = randomBytes(32).toString("base64url")
        await db.query(`delete from webflow_pending where created_at < now() - make_interval(mins => $1)`, [PENDING_TTL_MINUTES])
        await db.query(`insert into webflow_pending (token_hash, access_token_enc, sites) values ($1, $2, $3)`, [
            hash(setupToken),
            encryptSecret(accessToken),
            JSON.stringify(sites.map(s => ({ id: s.id, name: s.displayName, shortName: s.shortName }))),
        ])
        // In the fragment, so the setup token never reaches server logs or a Referer header.
        return c.redirect(`/webflow/setup#setup=${setupToken}`, 302)
    })

    const pending = async (c: Context) => {
        const token = /^Bearer (.+)$/.exec(c.req.header("authorization") ?? "")?.[1]
        if (!token) return null
        const { rows } = await db.query(
            `select * from webflow_pending where token_hash = $1 and created_at > now() - make_interval(mins => $2)`,
            [hash(token), PENDING_TTL_MINUTES]
        )
        return rows[0] ?? null
    }
    const expired = (c: Context) => c.json({ error: "This setup link has expired. Connect Webflow again." }, 401)

    app.get("/webflow/api/pending", async c => {
        const row = await pending(c)
        if (!row) return expired(c)
        return c.json({ sites: row.sites })
    })

    app.post("/webflow/api/preview", async c => {
        if (!(await pending(c))) return expired(c)
        const jobs = await fetchJobs(parseSource(await c.req.json().catch(() => ({}))))
        return c.json({ count: jobs.length, jobs: jobs.slice(0, 25).map(j => ({ title: j.title, department: j.department, location: j.location })) })
    })

    /** Creates (or reconnects) the site, runs the first sync, returns the management token. */
    app.post("/webflow/api/sites", async c => {
        const row = await pending(c)
        if (!row) return expired(c)
        const b = (await c.req.json().catch(() => ({}))) as any
        const site = (row.sites as { id: string; name: string; shortName: string }[]).find(s => s.id === b?.siteId)
        if (!site) throw new InputError("Choose one of the sites you authorised.")
        const publishMode = (b?.publishMode ?? "publish-jobs") as WebflowPublishMode
        if (!WEBFLOW_PUBLISH_MODES.includes(publishMode)) throw new InputError("Unknown publish mode.")
        const collectionName = typeof b?.collectionName === "string" && b.collectionName.trim() ? b.collectionName.trim().slice(0, 60) : "Jobs"
        const source = parseSource(b?.source)
        const manageToken = randomBytes(32).toString("base64url")

        const { rows } = await db.query(
            `insert into sites (platform, webflow_site_id, site_name, project_url, api_key_enc, api_key_hint, token_hash,
                                source_kind, source_handle, source_options, collection_name, publish_mode)
             values ('webflow', $1, $2, $3, $4, 'Webflow app', $5, $6, $7, $8, $9, $10)
             on conflict (webflow_site_id) do update set
                site_name = excluded.site_name, project_url = excluded.project_url, api_key_enc = excluded.api_key_enc,
                token_hash = excluded.token_hash, source_kind = excluded.source_kind, source_handle = excluded.source_handle,
                source_options = excluded.source_options, collection_name = excluded.collection_name,
                publish_mode = excluded.publish_mode, disconnected_at = null
             returning id`,
            [
                site.id,
                site.name,
                `https://webflow.com/dashboard/sites/${site.shortName}`,
                row.access_token_enc,
                hash(manageToken),
                source.kind,
                source.handle,
                JSON.stringify(source.options ?? {}),
                collectionName,
                publishMode,
            ]
        )
        const id = rows[0].id as string
        const run = await runSite(db, gateway, id, "manual")
        return c.json({ site: await getSite(db, id), token: manageToken, run }, 201)
    })

    /** Disconnect: revoke at Webflow, then delete the site, its token and its run log. */
    app.delete("/webflow/api/sites/:id", async c => {
        const id = c.req.param("id")
        const token = /^Bearer (.+)$/.exec(c.req.header("authorization") ?? "")?.[1]
        if (!/^[0-9a-f-]{36}$/.test(id) || !token) return c.json({ error: "Not connected." }, 401)
        const { rows } = await db.query(`select token_hash, api_key_enc from sites where id = $1 and platform = 'webflow'`, [id])
        const site = rows[0]
        if (!site) return c.json({ error: "Not connected." }, 401)
        const a = Buffer.from(site.token_hash, "hex")
        const b = Buffer.from(hash(token), "hex")
        if (a.length !== b.length || !timingSafeEqual(a, b)) return c.json({ error: "Not connected." }, 401)
        // One authorisation can cover several sites; revoke only when no other site still uses it.
        const { rows: siblings } = await db.query(`select 1 from sites where api_key_enc = $1 and id <> $2 limit 1`, [site.api_key_enc, id])
        if (config && site.api_key_enc && siblings.length === 0) {
            await revokeToken(config, decryptSecret(site.api_key_enc), fetchImpl).catch(err => console.error(`webflow revoke failed ${err?.name}`))
        }
        await db.query(`delete from sites where id = $1`, [id])
        return c.json({ deleted: true })
    })

    return app
}
