// Usage: node scripts/try-source.mjs <lever|greenhouse|ashby|personio> <handle> [key=value ...]
// Prints what a source returns, for checking a customer's board by hand.
import { listJobs } from "@syncroles/core"

const [kind, handle, ...rest] = process.argv.slice(2)
if (!kind || !handle) {
    console.error("Usage: node scripts/try-source.mjs <kind> <handle> [key=value ...]")
    process.exit(2)
}
const options = Object.fromEntries(rest.map(pair => pair.split("=")))
try {
    const jobs = await listJobs({ kind, handle, options })
    console.log(`${kind}/${handle}: ${jobs.length} jobs`)
    const first = jobs[0]
    if (first) console.log({ ...first, descriptionHtml: first.descriptionHtml.slice(0, 200) + "…" })
    const missing = key => jobs.filter(j => !j[key]).length
    console.log("missing:", Object.fromEntries(["department", "location", "employmentType", "publishedAt", "descriptionHtml"].map(k => [k, missing(k)])))
} catch (err) {
    console.error(`${err.name}: ${err.message}`)
    process.exit(1)
}
