import { readFile } from "node:fs/promises"
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { createApi } from "./api.js"
import { migrate, openDb } from "./db.js"
import { syncToFramer } from "./framer.js"
import { probe } from "./probe.js"
import { startScheduler } from "./scheduler.js"

const port = Number(process.env.PORT ?? 3000)
const app = new Hono()

app.get("/health", c => c.json({ ok: true }))

/** The public website: a fixed list, so no request path ever reaches the file system. */
const PAGES: Record<string, { file: string; type: string }> = {
    "/": { file: "index.html", type: "text/html; charset=utf-8" },
    "/privacy": { file: "privacy.html", type: "text/html; charset=utf-8" },
    "/impressum": { file: "impressum.html", type: "text/html; charset=utf-8" },
    "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
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
    app.route("/api", createApi({ db, framer }))
    startScheduler(db, framer)
    console.log("api and scheduler started")
} else {
    console.log("DATABASE_URL not set: serving the website only")
}

serve({ fetch: app.fetch, port }, () => console.log(`listening on ${port}`))

// Diagnostic, read-only: with PROBE=1, log what Framer reports about the test project's unpublished state.
if (process.env.PROBE === "1" && process.env.FRAMER_PROJECT_URL && process.env.FRAMER_API_KEY) {
    probe(process.env.FRAMER_PROJECT_URL, process.env.FRAMER_API_KEY).then(
        r => console.log("probe:", JSON.stringify(r)),
        err => console.log("probe failed:", err?.name, err?.code ?? "")
    )
}
