const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "https://syncroles.com/api"

export type SourceKind = "lever" | "greenhouse" | "ashby" | "personio"
export type PublishMode = "sync-only" | "publish-if-clean" | "always-publish"
export interface Source {
    kind: SourceKind
    handle: string
    options?: Record<string, string>
}
export interface Preview {
    count: number
    jobs: { title: string; department: string | null; location: string | null }[]
}
export interface Site {
    id: string
    apiKeyHint: string
    source: Source
    collectionName: string
    publishMode: PublishMode
    scheduled: boolean
    licenceExpiresAt: string | null
    lastRunAt: string | null
}
export interface Run {
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

export class ApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message)
    }
}

async function call<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
    let res: Response
    try {
        res = await fetch(BASE + path, {
            method,
            headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
        })
    } catch {
        throw new ApiError("Could not reach SyncRoles. Check your connection and try again.", 0)
    }
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) throw new ApiError(json.error ?? "Something went wrong.", res.status)
    return json as T
}

export const api = {
    preview: (source: Source) => call<Preview>("POST", "/preview", source),
    connect: (input: { projectUrl: string; apiKey: string; source: Source; publishMode: PublishMode }) =>
        call<{ site: Site; token: string; run: Run }>("POST", "/sites", input),
    status: (id: string, token: string) => call<{ site: Site; runs: Run[] }>("GET", `/sites/${id}`, undefined, token),
    sync: (id: string, token: string, confirmEmpty = false) =>
        call<{ site: Site; run: Run }>("POST", `/sites/${id}/sync`, { confirmEmpty }, token),
    setPublishMode: (id: string, token: string, publishMode: PublishMode) =>
        call<{ site: Site }>("PATCH", `/sites/${id}`, { publishMode }, token),
    setSource: (id: string, token: string, source: Source) => call<{ site: Site }>("PATCH", `/sites/${id}`, { source }, token),
    portal: (id: string, token: string) => call<{ url: string }>("POST", `/sites/${id}/portal`, undefined, token),
    licence: (id: string, token: string, key: string) => call<{ site: Site }>("POST", `/sites/${id}/licence`, { key }, token),
    disconnect: (id: string, token: string) => call<{ deleted: true }>("DELETE", `/sites/${id}`, undefined, token),
}

/**
 * The management token lives in this browser only. It is deliberately not put in
 * Framer plugin data, which is shared with every collaborator on the project.
 */
export const session = {
    load(projectId: string): { id: string; token: string } | null {
        try {
            const raw = localStorage.getItem(`syncroles:${projectId}`)
            return raw ? JSON.parse(raw) : null
        } catch {
            return null
        }
    },
    save(projectId: string, value: { id: string; token: string }) {
        try {
            localStorage.setItem(`syncroles:${projectId}`, JSON.stringify(value))
        } catch {
            /* private mode: the user reconnects next time */
        }
    },
    clear(projectId: string) {
        try {
            localStorage.removeItem(`syncroles:${projectId}`)
        } catch {
            /* nothing stored */
        }
    },
}
