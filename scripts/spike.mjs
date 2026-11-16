// Live spike: sync one job board into a Framer project.
//   FRAMER_PROJECT_URL=... FRAMER_API_KEY=... node scripts/spike.mjs <kind> <handle> [publishMode] [collectionName]
// publishMode defaults to "sync-only": this never publishes unless you ask.
import { syncToFramer } from "../apps/server/dist/framer.js"

const [kind, handle, publishMode = "sync-only", collectionName = "Jobs"] = process.argv.slice(2)
const { FRAMER_PROJECT_URL: projectUrl, FRAMER_API_KEY: apiKey } = process.env
if (!kind || !handle || !projectUrl || !apiKey) {
    console.error("Set FRAMER_PROJECT_URL and FRAMER_API_KEY, then: node scripts/spike.mjs <kind> <handle> [publishMode] [collectionName]")
    process.exit(2)
}
const started = Date.now()
const report = await syncToFramer({ projectUrl, apiKey, source: { kind, handle }, collectionName, publishMode })
console.log(report, `${Date.now() - started} ms`)
