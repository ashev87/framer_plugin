import type { Job, SourceAdapter, SourceConfig, SourceKind } from "../job.js"
import { ashby } from "./ashby.js"
import { greenhouse } from "./greenhouse.js"
import { lever } from "./lever.js"
import { personio } from "./personio.js"

export const adapters: Record<SourceKind, SourceAdapter> = { lever, greenhouse, ashby, personio }

export function listJobs(config: SourceConfig, fetchImpl: typeof fetch = fetch): Promise<Job[]> {
    return adapters[config.kind].listJobs(config, fetchImpl)
}
