import { useCallback, useEffect, useState } from "react"
import { api, ApiError, session, type Preview, type PublishMode, type Run, type Site, type Source, type SourceKind } from "./api"

const SOURCES: { kind: SourceKind; label: string; hint: string }[] = [
    { kind: "lever", label: "Lever", hint: "jobs.lever.co/<handle>" },
    { kind: "greenhouse", label: "Greenhouse", hint: "boards.greenhouse.io/<handle>" },
    { kind: "ashby", label: "Ashby", hint: "jobs.ashbyhq.com/<handle>" },
    { kind: "personio", label: "Personio", hint: "<handle>.jobs.personio.de" },
]

const MODES: { mode: PublishMode; label: string; detail: string }[] = [
    { mode: "sync-only", label: "I publish myself", detail: "Jobs are updated in the CMS. They go live the next time you publish." },
    { mode: "publish-if-clean", label: "Publish when only jobs changed", detail: "Publishes after a sync unless the project has other unpublished changes." },
    { mode: "always-publish", label: "Always publish", detail: "Publishes the whole project after every sync that changed something, including unfinished design work." },
]

const message = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong.")

export function App({ projectId }: { projectId: string }) {
    const [saved, setSaved] = useState(() => session.load(projectId))
    const connected = (value: { id: string; token: string }) => {
        session.save(projectId, value)
        setSaved(value)
    }
    const disconnected = () => {
        session.clear(projectId)
        setSaved(null)
    }
    return saved ? (
        <Status id={saved.id} token={saved.token} onGone={disconnected} />
    ) : (
        <Onboarding projectId={projectId} onConnected={connected} />
    )
}

function Onboarding({ projectId, onConnected }: { projectId: string; onConnected: (v: { id: string; token: string }) => void }) {
    const [kind, setKind] = useState<SourceKind>("lever")
    const [handle, setHandle] = useState("")
    const [euRegion, setEuRegion] = useState(false)
    const [preview, setPreview] = useState<Preview | null>(null)
    const [apiKey, setApiKey] = useState("")
    const [projectUrl, setProjectUrl] = useState("")
    const [needUrl, setNeedUrl] = useState(true)
    const [publishMode, setPublishMode] = useState<PublishMode>("sync-only")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const source: Source = { kind, handle: handle.trim(), options: kind === "lever" && euRegion ? { region: "eu" } : {} }
    const hint = SOURCES.find(s => s.kind === kind)!.hint

    const run = async (work: () => Promise<void>) => {
        setBusy(true)
        setError(null)
        try {
            await work()
        } catch (err) {
            const text = message(err)
            if (text.startsWith("PROJECT_URL_NEEDED")) {
                setNeedUrl(true)
                setError(needUrl ? "That does not look like a Framer project URL." : null)
            } else {
                setError(text)
            }
        } finally {
            setBusy(false)
        }
    }

    if (!preview) {
        return (
            <main>
                <h1>1. Choose your job board</h1>
                <label>
                    Hiring tool
                    <select value={kind} onChange={e => setKind(e.target.value as SourceKind)}>
                        {SOURCES.map(s => (
                            <option key={s.kind} value={s.kind}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Company handle
                    <input type="text" value={handle} placeholder="acme" onChange={e => setHandle(e.target.value)} />
                    <small>The part of your job board address shown here: {hint}</small>
                </label>
                {kind === "lever" && (
                    <label className="row">
                        <input type="checkbox" checked={euRegion} onChange={e => setEuRegion(e.target.checked)} />
                        <span>Our Lever account is hosted in the EU</span>
                    </label>
                )}
                {error && <p className="error">{error}</p>}
                <div className="spacer" />
                <button className="framer-button-primary" disabled={busy || !handle.trim()} onClick={() => run(async () => setPreview(await api.preview(source)))}>
                    {busy ? "Looking…" : "Find jobs"}
                </button>
            </main>
        )
    }

    return (
        <main>
            <h1>2. Connect this project</h1>
            <p className="ok">
                Found {preview.count} open {preview.count === 1 ? "job" : "jobs"}.{" "}
                <button className="link" onClick={() => setPreview(null)}>
                    Change
                </button>
            </p>
            {preview.count > 0 && (
                <ul className="jobs">
                    {preview.jobs.map((j, i) => (
                        <li key={i}>
                            {j.title}
                            <small>{[j.department, j.location].filter(Boolean).join(" · ")}</small>
                        </li>
                    ))}
                </ul>
            )}
            {needUrl && (
                <label>
                    Project URL
                    <input type="text" value={projectUrl} placeholder="https://framer.com/projects/…" onChange={e => setProjectUrl(e.target.value)} />
                    <small>Copy the address from your browser's address bar while this project is open.</small>
                </label>
            )}
            <label>
                Framer Server API key
                <input type="password" value={apiKey} autoComplete="off" onChange={e => setApiKey(e.target.value)} />
                <small>Site Settings › General › API keys. It is stored encrypted and you can delete it here at any time.</small>
            </label>
            {MODES.map(m => (
                <label className="row" key={m.mode}>
                    <input type="radio" name="mode" checked={publishMode === m.mode} onChange={() => setPublishMode(m.mode)} />
                    <span>
                        {m.label}
                        <small>{m.detail}</small>
                    </span>
                </label>
            ))}
            <div className="spacer" />
            <div className="footer">
            {error && <p className="error">{error}</p>}
            <button
                className="framer-button-primary"
                disabled={busy || !apiKey.trim() || (needUrl && !projectUrl.trim())}
                onClick={() =>
                    run(async () => {
                        const res = await api.connect({ projectUrl: needUrl ? projectUrl.trim() : projectId, apiKey: apiKey.trim(), source, publishMode })
                        if (res.run.status === "failed") {
                            // The key did not work: forget the connection instead of leaving a broken one behind.
                            await api.disconnect(res.site.id, res.token).catch(() => {})
                            throw new ApiError(res.run.message ?? "The first sync failed.", 422)
                        }
                        onConnected({ id: res.site.id, token: res.token })
                    })
                }
            >
                {busy ? "Syncing…" : "Create Jobs collection and sync"}
            </button>
            </div>
        </main>
    )
}

function describe(run: Run): string {
    if (run.status === "failed") return run.message ?? "Failed"
    const parts = [`${run.created ?? 0} added`, `${run.updated ?? 0} updated`, `${run.removed ?? 0} removed`]
    return parts.join(", ") + (run.published ? ", published" : "")
}

function Status({ id, token, onGone }: { id: string; token: string; onGone: () => void }) {
    const [site, setSite] = useState<Site | null>(null)
    const [runs, setRuns] = useState<Run[]>([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [licenceKey, setLicenceKey] = useState("")
    const [editing, setEditing] = useState(false)
    const [kind, setKind] = useState<SourceKind>("lever")
    const [handle, setHandle] = useState("")

    const guard = useCallback(
        async (work: () => Promise<void>) => {
            setBusy(true)
            setError(null)
            try {
                await work()
            } catch (err) {
                if (err instanceof ApiError && err.status === 401) return onGone()
                setError(message(err))
            } finally {
                setBusy(false)
            }
        },
        [onGone]
    )
    const refresh = useCallback(
        () =>
            guard(async () => {
                const res = await api.status(id, token)
                setSite(res.site)
                setRuns(res.runs)
            }),
        [guard, id, token]
    )
    useEffect(() => {
        void refresh()
    }, [refresh])

    if (!site) return <main>{error ? <p className="error">{error}</p> : <p>Loading…</p>}</main>
    const last = runs[0]
    // The server refuses to empty the collection on its own; the customer has to say so.
    const needsEmptyConfirm = last?.status === "failed" && (last.message ?? "").includes("returned 0 jobs")

    if (editing) {
        const next: Source = { kind, handle: handle.trim(), options: {} }
        return (
            <main>
                <h1>Change job board</h1>
                <p>The Jobs collection will follow the new board: its roles are added and the current ones are removed at the next sync.</p>
                <label>
                    Hiring tool
                    <select value={kind} onChange={e => setKind(e.target.value as SourceKind)}>
                        {SOURCES.map(s => (
                            <option key={s.kind} value={s.kind}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Company handle
                    <input type="text" value={handle} placeholder="acme" onChange={e => setHandle(e.target.value)} />
                    <small>{SOURCES.find(s => s.kind === kind)!.hint}</small>
                </label>
                <div className="spacer" />
                <div className="footer">
                    {error && <p className="error">{error}</p>}
                    <button
                        className="framer-button-primary"
                        disabled={busy || !handle.trim()}
                        onClick={() =>
                            guard(async () => {
                                const found = await api.preview(next)
                                if (found.count === 0) throw new ApiError("That board has no open jobs right now, so there is nothing to switch to.", 422)
                                await api.setSource(id, token, next)
                                await api.sync(id, token)
                                setEditing(false)
                                await refresh()
                            })
                        }
                    >
                        {busy ? "Working…" : "Switch and sync"}
                    </button>
                    <button disabled={busy} onClick={() => { setError(null); setEditing(false) }}>
                        Cancel
                    </button>
                </div>
            </main>
        )
    }

    return (
        <main>
            <h1>
                {SOURCES.find(s => s.kind === site.source.kind)?.label} · {site.source.handle}{" "}
                <button className="link" disabled={busy} onClick={() => { setKind(site.source.kind); setHandle(""); setError(null); setEditing(true) }}>
                    Change
                </button>
            </h1>
            <div className="card">
                <p>
                    {site.scheduled ? "Syncing automatically every 15 minutes." : "Manual sync. Add a licence to sync automatically every 15 minutes."}
                </p>
                {last && (
                    <p className={last.status === "failed" ? "error" : undefined}>
                        Last run {new Date(last.finishedAt).toLocaleString()}: {describe(last)}
                        {last.status === "ok" && last.message ? ` (${last.message})` : ""}
                    </p>
                )}
            </div>
            <button className="framer-button-primary" disabled={busy} onClick={() => guard(async () => { await api.sync(id, token); await refresh() })}>
                {busy ? "Working…" : "Sync now"}
            </button>
            {needsEmptyConfirm && (
                <button disabled={busy} onClick={() => guard(async () => { await api.sync(id, token, true); await refresh() })}>
                    All roles are closed: remove them
                </button>
            )}
            <label>
                Publishing
                <select
                    value={site.publishMode}
                    disabled={busy}
                    onChange={e => guard(async () => setSite((await api.setPublishMode(id, token, e.target.value as PublishMode)).site))}
                >
                    {MODES.map(m => (
                        <option key={m.mode} value={m.mode}>
                            {m.label}
                        </option>
                    ))}
                </select>
                <small>{MODES.find(m => m.mode === site.publishMode)?.detail}</small>
            </label>
            {!site.scheduled && (
                <label>
                    Licence key
                    <input type="text" value={licenceKey} onChange={e => setLicenceKey(e.target.value)} />
                    <button disabled={busy || !licenceKey.trim()} onClick={() => guard(async () => setSite((await api.licence(id, token, licenceKey)).site))}>
                        Activate automatic sync
                    </button>
                    <small>
                        Automatic sync is $99 per site per year at{" "}
                        <a href="https://syncroles.com/#pricing" target="_blank" rel="noreferrer">
                            syncroles.com
                        </a>
                    </small>
                </label>
            )}
            {error && <p className="error">{error}</p>}
            {runs.length > 1 && (
                <ul className="jobs">
                    {runs.slice(1, 8).map((r, i) => (
                        <li key={i}>
                            {describe(r)}
                            <small>
                                {new Date(r.finishedAt).toLocaleString()} · {r.trigger}
                            </small>
                        </li>
                    ))}
                </ul>
            )}
            <div className="spacer" />
            <p>
                API key {site.apiKeyHint}.{" "}
                <button
                    className="link"
                    disabled={busy}
                    onClick={() => guard(async () => { await api.disconnect(id, token); onGone() })}
                >
                    Disconnect and delete stored key
                </button>
            </p>
        </main>
    )
}
