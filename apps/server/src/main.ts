import { readFile } from "node:fs/promises"
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { createApi } from "./api.js"
import { migrate, openDb } from "./db.js"
import { syncToFramer } from "./framer.js"
import { probe } from "./probe.js"
import { startScheduler } from "./scheduler.js"
import { createBilling, portalUrl, type StripeConfig } from "./stripe.js"

const port = Number(process.env.PORT ?? 3000)
const app = new Hono()

app.get("/health", c => c.json({ ok: true }))

/** The public website: a fixed list, so no request path ever reaches the file system. */
const PAGES: Record<string, { file: string; type: string }> = {
    "/": { file: "index.html", type: "text/html; charset=utf-8" },
    "/privacy": { file: "privacy.html", type: "text/html; charset=utf-8" },
    "/impressum": { file: "impressum.html", type: "text/html; charset=utf-8" },
    "/thanks": { file: "thanks.html", type: "text/html; charset=utf-8" },
    "/manage": { file: "manage.html", type: "text/html; charset=utf-8" },
    "/docs": { file: "docs.html", type: "text/html; charset=utf-8" },
    "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
    "/favicon.svg": { file: "favicon.svg", type: "image/svg+xml" },
    "/favicon.ico": { file: "favicon.svg", type: "image/svg+xml" },
    "/fonts/geist.woff2": { file: "fonts/geist.woff2", type: "font/woff2" },
    "/fonts/geist-mono.woff2": { file: "fonts/geist-mono.woff2", type: "font/woff2" },
    "/robots.txt": { file: "robots.txt", type: "text/plain; charset=utf-8" },
    "/sitemap.xml": { file: "sitemap.xml", type: "application/xml" },
    "/llms.txt": { file: "llms.txt", type: "text/plain; charset=utf-8" },
}
for (const [path, page] of Object.entries(PAGES)) {
    app.get(path, async c => {
        const body = await readFile(new URL(`../public/${page.file}`, import.meta.url))
        return c.body(body, 200, { "content-type": page.type, "cache-control": "public, max-age=300" })
    })
}

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl) {
    if (Buffer.from(process.env.SECRETS_KEY ?? "", "base64").length !== 32) {
        console.log("WARNING: SECRETS_KEY is not set to 32 base64 bytes; connecting a project will fail until it is")
    }
    const db = openDb(databaseUrl)
    await migrate(db)
    const framer = { sync: syncToFramer }
    const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env
    const billing: StripeConfig | null =
        STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET
            ? { secretKey: STRIPE_SECRET_KEY, webhookSecret: STRIPE_WEBHOOK_SECRET, siteUrl: process.env.SITE_URL ?? "https://syncroles.com",
                portalConfiguration: process.env.STRIPE_PORTAL_CONFIGURATION || undefined }
            : null
    app.route("/api", createApi({ db, framer, portal: billing ? siteId => portalUrl(db, billing, { siteId }) : undefined }))
    startScheduler(db, framer)
    console.log("api and scheduler started")
    if (billing) {
        app.route("/", createBilling(db, billing))
        console.log("billing started")
    } else {
        app.get("/buy", c => c.text("Checkout opens this week. Please come back soon.", 503))
        console.log("STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET not set: checkout is off")
    }
} else {
    console.log("DATABASE_URL not set: serving the website only")
}

serve({ fetch: app.fetch, port }, () => console.log(`listening on ${port}`))

// One-off check before launch: SELFTEST_SOURCES="greenhouse:stripe,ashby:ashby" syncs each board into its own
// "Test <kind>" collection of the test project (never publishes) and logs the result.
const selftest = process.env.SELFTEST_SOURCES
if (selftest && process.env.FRAMER_PROJECT_URL && process.env.FRAMER_API_KEY) {
    void (async () => {
        for (const pair of selftest.split(",")) {
            const [kind, handle] = pair.trim().split(":")
            const started = Date.now()
            try {
                const report = await syncToFramer({
                    projectUrl: process.env.FRAMER_PROJECT_URL!,
                    apiKey: process.env.FRAMER_API_KEY!,
                    source: { kind: kind as "lever", handle: handle! },
                    collectionName: `Test ${kind}`,
                    publishMode: "sync-only",
                })
                console.log(`selftest ${pair}: ok ${JSON.stringify(report)} ${Date.now() - started} ms`)
            } catch (err) {
                console.log(`selftest ${pair}: failed ${(err as Error)?.name} ${(err as { code?: string })?.code ?? ""} ${(err as Error)?.message?.slice(0, 200)}`)
            }
        }
    })()
}

// Diagnostic, read-only: with PROBE=1, log what Framer reports about the test project's unpublished state.
if (process.env.PROBE === "1" && process.env.FRAMER_PROJECT_URL && process.env.FRAMER_API_KEY) {
    probe(process.env.FRAMER_PROJECT_URL, process.env.FRAMER_API_KEY).then(
        r => console.log("probe:", JSON.stringify(r)),
        err => console.log("probe failed:", err?.name, err?.code ?? "")
    )
}
