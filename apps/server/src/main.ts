import { createServer } from "node:http"
import { syncToFramer, type PublishMode } from "./framer.js"

const port = Number(process.env.PORT ?? 3000)

createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}')
        return
    }
    res.writeHead(404).end()
}).listen(port, () => console.log(`listening on ${port}`))

// Temporary spike runner, removed once the real onboarding API exists:
// with SPIKE_SOURCE=<kind>:<handle> set, run one sync at boot and log the report.
const spike = process.env.SPIKE_SOURCE
if (spike) {
    const [kind, handle] = spike.split(":")
    const projectUrl = process.env.FRAMER_PROJECT_URL
    const apiKey = process.env.FRAMER_API_KEY
    if (!kind || !handle || !projectUrl || !apiKey) {
        console.log("spike: skipped, need SPIKE_SOURCE=<kind>:<handle>, FRAMER_PROJECT_URL and FRAMER_API_KEY")
    } else {
        const started = Date.now()
        syncToFramer({
            projectUrl,
            apiKey,
            source: { kind: kind as "lever", handle },
            collectionName: process.env.SPIKE_COLLECTION ?? "Jobs",
            publishMode: (process.env.SPIKE_PUBLISH_MODE ?? "sync-only") as PublishMode,
        }).then(
            report => console.log("spike: ok", JSON.stringify(report), `${Date.now() - started} ms`),
            err => console.log("spike: failed", err?.name, err?.code ?? "", err?.message)
        )
    }
}
