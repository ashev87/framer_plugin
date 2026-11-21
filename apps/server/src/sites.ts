import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { SourceError, SyncAbortedError, type SourceConfig, type SourceKind } from "@syncroles/core"
import type { Db } from "./db.js"
import type { PublishMode, RunReport, SyncRequest } from "./framer.js"
import { decryptSecret, encryptSecret, maskSecret } from "./secrets.js"
import { WebflowApiError, type WebflowPublishMode, type WebflowRunReport, type WebflowSyncRequest } from "./webflow.js"

export const SOURCE_KINDS: SourceKind[] = ["lever", "greenhouse", "ashby", "personio"]
export const PUBLISH_MODES: PublishMode[] = ["sync-only", "publish-if-clean", "always-publish"]
export const WEBFLOW_PUBLISH_MODES: WebflowPublishMode[] = ["sync-only", "publish-jobs"]
export type Platform = "framer" | "webflow"

/** What the rest of the server may do with Framer and Webflow. Faked in tests. */
export interface FramerGateway {
    sync(req: SyncRequest): Promise<RunReport>
    syncWebflow?(req: WebflowSyncRequest): Promise<WebflowRunReport>
}

export class InputError extends Error {}

export function parseProjectId(projectUrl: string): string {
    const input = projectUrl.trim()
    // From a URL: /projects/<Name>--<id>[-<suffix>]. From the plugin: the id, possibly with the same suffix.
    const match = /\/projects\/(?:[^/?#]*--)?([A-Za-z0-9]{20})(?:[-/?#]|$)/.exec(input)
    const bare = /^([A-Za-z0-9]{20})(?:-[A-Za-z0-9]+)?$/.exec(input)
    const id = match?.[1] ?? bare?.[1]
    if (!id) {
        // Shape only, to learn what Framer hands the plugin; a project id is not a secret but need not be logged whole.
        console.log(`unrecognised project reference: length=${input.length} shape=${input.replace(/[A-Za-z]/g, "a").replace(/[0-9]/g, "9").slice(0, 80)}`)
        throw new InputError("PROJECT_URL_NEEDED: Paste this project's URL from your browser's address bar.")
    }
    return id
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export interface SiteInput {
    projectUrl: string
    apiKey: string
    source: SourceConfig
    collectionName: string
    publishMode: PublishMode
}

export interface SiteView {
    id: string
    platform: Platform
    /** Webflow site name; null for Framer sites. */
    siteName: string | null
    /** True after Webflow access was revoked; the token is already deleted. */
    disconnected: boolean
    projectUrl: string | null
    apiKeyHint: string
    source: SourceConfig
    collectionName: string
    publishMode: PublishMode
    scheduled: boolean
    licenceExpiresAt: string | null
    lastRunAt: string | null
}

const SITE_COLUMNS = `s.*, l.expires_at as licence_expires_at,
    (l.id is not null and l.status = 'active' and l.expires_at > now()) as scheduled`

function toView(row: any): SiteView {
    return {
        id: row.id,
        platform: row.platform ?? "framer",
        siteName: row.site_name ?? null,
        disconnected: row.disconnected_at != null,
        projectUrl: row.project_url,
        apiKeyHint: row.api_key_hint,
        source: { kind: row.source_kind, handle: row.source_handle, options: row.source_options },
        collectionName: row.collection_name,
        publishMode: row.publish_mode,
        scheduled: row.scheduled === true,
        licenceExpiresAt: row.licence_expires_at ? new Date(row.licence_expires_at).toISOString() : null,
        lastRunAt: row.last_run_at ? new Date(row.last_run_at).toISOString() : null,
    }
}

/**
 * Connect a project, or reconnect one that already exists. Presenting a working
 * API key for the project is what proves control of it, so a reconnect issues a
 * fresh management token and invalidates the old one.
 */
export async function connectSite(db: Db, input: SiteInput): Promise<{ site: SiteView; token: string }> {
    const projectId = parseProjectId(input.projectUrl)
    const token = randomBytes(32).toString("base64url")
    const { rows } = await db.query(
        `insert into sites (framer_project_id, project_url, api_key_enc, api_key_hint, token_hash,
                            source_kind, source_handle, source_options, collection_name, publish_mode)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (framer_project_id) do update set
            project_url = excluded.project_url, api_key_enc = excluded.api_key_enc, api_key_hint = excluded.api_key_hint,
            token_hash = excluded.token_hash, source_kind = excluded.source_kind, source_handle = excluded.source_handle,
            source_options = excluded.source_options, collection_name = excluded.collection_name,
            publish_mode = excluded.publish_mode
         returning id`,
        [
            projectId,
            input.projectUrl.trim().split(/[?#]/)[0],
            encryptSecret(input.apiKey),
            maskSecret(input.apiKey),
            hashToken(token),
            input.source.kind,
            input.source.handle,
            JSON.stringify(input.source.options ?? {}),
            input.collectionName,
            input.publishMode,
        ]
    )
    return { site: (await getSite(db, rows[0].id))!, token }
}

export async function getSite(db: Db, id: string): Promise<SiteView | null> {
    const { rows } = await db.query(`select ${SITE_COLUMNS} from sites s left join licences l on l.id = s.licence_id where s.id = $1`, [id])
    return rows[0] ? toView(rows[0]) : null
}

export async function tokenMatches(db: Db, id: string, token: string): Promise<boolean> {
    const { rows } = await db.query(`select token_hash from sites where id = $1`, [id])
    if (!rows[0]) return false
    const a = Buffer.from(rows[0].token_hash, "hex")
    const b = Buffer.from(hashToken(token), "hex")
    return a.length === b.length && timingSafeEqual(a, b)
}

export async function updateSite(db: Db, id: string, patch: { publishMode?: PublishMode | WebflowPublishMode; source?: SourceConfig }): Promise<void> {
    if (patch.publishMode) await db.query(`update sites set publish_mode = $2 where id = $1`, [id, patch.publishMode])
    if (patch.source) {
        await db.query(`update sites set source_kind = $2, source_handle = $3, source_options = $4 where id = $1`, [
            id,
            patch.source.kind,
            patch.source.handle,
            JSON.stringify(patch.source.options ?? {}),
        ])
    }
}

/** Removes the site, its encrypted key and its run log. The Framer collection is left as it is. */
export async function deleteSite(db: Db, id: string): Promise<void> {
    await db.query(`delete from sites where id = $1`, [id])
}

export interface RunView {
    trigger: "manual" | "schedule"
    status: "ok" | "failed"
    finishedAt: string
    jobsInSource: number | null
    created: number | null
    updated: number | null
    removed: number | null
    published: boolean
    message: string | null
}

export async function listRuns(db: Db, siteId: string, limit = 20): Promise<RunView[]> {
    const { rows } = await db.query(`select * from runs where site_id = $1 order by id desc limit $2`, [siteId, limit])
    return rows.map(r => ({
        trigger: r.trigger,
        status: r.status,
        finishedAt: new Date(r.finished_at).toISOString(),
        jobsInSource: r.jobs_in_source,
        created: r.created,
        updated: r.updated,
        removed: r.removed,
        published: r.published,
        message: r.message,
    }))
}

/** A message safe to show the customer: our own errors verbatim, anything else generic. */
function customerMessage(err: unknown): string {
    if (err instanceof SourceError || err instanceof SyncAbortedError || err instanceof InputError) return err.message
    if (err instanceof WebflowApiError) {
        if (err.status === 401 || err.status === 403) return "Webflow access was removed for this site. Connect it again at syncroles.com/webflow."
        if (err.needsCmsPlan) return "This Webflow site has no CMS plan. Upgrade the site plan in Webflow, then sync again."
        if (err.status === 429 || err.status >= 500) return "Webflow did not respond properly right now. The next run will try again."
        return `Webflow refused a change: ${err.webflowMessage.slice(0, 300)}. Nothing else was changed after the error.`
    }
    const code = (err as { code?: string })?.code
    if (code === "UNAUTHORIZED") return "Framer rejected the API key. Create a new key in Site Settings > General and reconnect."
    if (code === "PROJECT_CLOSED" || code === "TIMEOUT" || code === "POOL_EXHAUSTED") return "Framer could not open the project right now. The next run will try again."
    return "The sync failed because of an unexpected error. Nothing else was changed after the error."
}

const running = new Set<string>()

/** One sync of one site, recorded in the run log whatever happens. */
export async function runSite(
    db: Db,
    framer: FramerGateway,
    siteId: string,
    trigger: "manual" | "schedule",
    options: { allowEmptySource?: boolean } = {}
): Promise<RunView> {
    if (running.has(siteId)) throw new InputError("A sync for this site is already running.")
    running.add(siteId)
    const startedAt = new Date()
    try {
        const { rows } = await db.query(`select * from sites where id = $1`, [siteId])
        const site = rows[0]
        if (!site) throw new InputError("Site not found.")
        let report: RunReport | WebflowRunReport | null = null
        let message: string | null = null
        if (site.disconnected_at) throw new InputError("Webflow access was removed for this site. Connect it again at syncroles.com/webflow.")
        const source = { kind: site.source_kind, handle: site.source_handle, options: site.source_options }
        try {
            if (site.platform === "webflow") {
                if (!framer.syncWebflow) throw new Error("Webflow sync is not configured on this server.")
                report = await framer.syncWebflow({
                    siteId: site.webflow_site_id,
                    accessToken: decryptSecret(site.api_key_enc),
                    source,
                    collectionName: site.collection_name,
                    publishMode: site.publish_mode,
                    allowEmptySource: options.allowEmptySource,
                })
            } else {
                report = await framer.sync({
                    projectUrl: site.project_url,
                    apiKey: decryptSecret(site.api_key_enc),
                    source,
                    collectionName: site.collection_name,
                    publishMode: site.publish_mode,
                    allowEmptySource: options.allowEmptySource,
                })
            }
            message = report.publishSkippedReason
        } catch (err) {
            message = customerMessage(err)
            // Revoked or uninstalled: the token is useless, so delete it now (Webflow Marketplace requirement).
            if (site.platform === "webflow" && err instanceof WebflowApiError && err.status === 401) {
                await db.query(`update sites set api_key_enc = '', disconnected_at = now() where id = $1`, [siteId])
            }
            // Error name and code only: messages from other libraries are not trusted to be free of secrets.
            console.error(`run failed site=${siteId} ${(err as Error)?.name} ${(err as { code?: string })?.code ?? ""}`)
        }
        await db.query(
            `insert into runs (site_id, trigger, status, started_at, jobs_in_source, created, updated, removed, published, message)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [siteId, trigger, report ? "ok" : "failed", startedAt, report?.jobsInSource ?? null, report?.created ?? null,
             report?.updated ?? null, report?.removed ?? null, report?.published ?? false, message]
        )
        await db.query(
            `update sites set last_run_at = now(), consecutive_failures = case when $2 then 0 else consecutive_failures + 1 end where id = $1`,
            [siteId, report !== null]
        )
        return (await listRuns(db, siteId, 1))[0]!
    } finally {
        running.delete(siteId)
    }
}

/** Sites with an active licence whose last run is at least `intervalMinutes` old. */
export async function dueSites(db: Db, intervalMinutes: number): Promise<string[]> {
    const { rows } = await db.query(
        `select s.id from sites s join licences l on l.id = s.licence_id
         where l.status = 'active' and l.expires_at > now() and s.disconnected_at is null
           and (s.last_run_at is null or s.last_run_at < now() - make_interval(mins => $1))
         order by s.last_run_at nulls first limit 50`,
        [intervalMinutes]
    )
    return rows.map(r => r.id)
}

export async function attachLicence(db: Db, siteId: string, key: string): Promise<void> {
    const { rows } = await db.query(
        `select l.id, l.max_sites, l.status, l.expires_at, (select count(*) from sites s where s.licence_id = l.id and s.id <> $2)::int as used
         from licences l where l.key = $1`,
        [key.trim(), siteId]
    )
    const licence = rows[0]
    if (!licence) throw new InputError("That licence key is not valid.")
    if (licence.status !== "active" || new Date(licence.expires_at) < new Date()) throw new InputError("That licence is no longer active.")
    if (licence.used >= licence.max_sites) throw new InputError(`That licence is already used on ${licence.used} site(s), which is its limit.`)
    await db.query(`update sites set licence_id = $2 where id = $1`, [siteId, licence.id])
}
