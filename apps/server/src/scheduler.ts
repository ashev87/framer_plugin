import type { Db } from "./db.js"
import { dueSites, runSite, type FramerGateway } from "./sites.js"

const SYNC_INTERVAL_MINUTES = 60
const TICK_MS = 5 * 60 * 1000

/** Every few minutes, sync the licensed sites whose last run is an hour old. One at a time. */
export function startScheduler(db: Db, framer: FramerGateway): () => void {
    let busy = false
    const tick = async () => {
        if (busy) return
        busy = true
        try {
            for (const id of await dueSites(db, SYNC_INTERVAL_MINUTES)) {
                await runSite(db, framer, id, "schedule").catch(err => console.error(`scheduled run error site=${id} ${err?.name}`))
            }
        } catch (err) {
            console.error(`scheduler tick failed ${(err as Error)?.name}`)
        } finally {
            busy = false
        }
    }
    const timer = setInterval(tick, TICK_MS)
    void tick()
    return () => clearInterval(timer)
}
