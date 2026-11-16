import { connect } from "framer-api"

/** Diagnostic: what Framer reports about a project's unpublished state. Read-only. */
export async function probe(projectUrl: string, apiKey: string): Promise<Record<string, unknown>> {
    const framer = await connect(projectUrl, apiKey)
    const out: Record<string, unknown> = {}
    const step = async (name: string, fn: () => Promise<unknown>) => {
        try {
            out[name] = await fn()
        } catch (err) {
            out[name] = `ERROR ${(err as Error).name}: ${(err as Error).message}`
        }
    }
    try {
        await step("unpublishedPageChanges", async () =>
            (await framer.getUnpublishedPageChanges()).map(c => ({ path: c.path, status: c.status }))
        )
        await step("changedPaths", () => framer.getChangedPaths())
        await step("publishInfo", () => framer.getPublishInfo())
        await step("managedCollections", async () =>
            (await framer.getManagedCollections()).map(c => ({ name: c.name, managedBy: c.managedBy }))
        )
        await step("collections", async () =>
            (await framer.getCollections()).map(c => ({ name: c.name, managedBy: c.managedBy, readonly: c.readonly }))
        )
        await step("branchChanges", async () => {
            const branch = await framer.getActiveBranch()
            return { branch: branch.title, baseId: branch.baseId, changes: await branch.getChanges() }
        })
    } finally {
        await framer.disconnect().catch(() => {})
    }
    return out
}
