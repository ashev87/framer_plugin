// Renders the real plugin screens on a branded background for Marketplace images. Not part of the plugin build.
import "@framer/plugin/framer.css"
import "../src/App.css"
import { createRoot } from "react-dom/client"
import { App } from "../src/App"

const params = new URLSearchParams(location.search)
const shot = params.get("shot") ?? "find"
const captions: Record<string, [string, string]> = {
    find: ["Pick your hiring tool", "Lever, Greenhouse, Ashby or Personio. Your job-board address is all it needs."],
    connect: ["Choose how publishing works", "SyncRoles never publishes unless you pick a mode that allows it."],
    status: ["It runs by itself", "Every 15 minutes from our server, with a log of what changed."],
}
const [title, sub] = captions[shot] ?? captions.find!
if (shot === "status") localStorage.setItem("syncroles:demo", JSON.stringify({ id: "00000000-0000-0000-0000-000000000000", token: "demo" }))
else localStorage.removeItem("syncroles:demo")

// Framer injects its theme colours at runtime; these approximate its dark theme, taken from screenshots of the plugin in Framer.
const theme = document.createElement("style")
theme.textContent = `[data-framer-theme="dark"]{--framer-color-bg:#121212;--framer-color-bg-secondary:#1b1b1b;--framer-color-bg-tertiary:#222;
--framer-color-control:#2b2b2b;--framer-color-control-hover:#333;--framer-color-divider:#2a2a2a;--framer-color-text:#fff;--framer-color-text-reversed:#fff;
--framer-color-text-secondary:#a3a3a3;--framer-color-text-tertiary:#666;--framer-color-tint:#0099ff;--framer-color-tint-dark:#0088ee;
--framer-color-tint-dimmed:rgba(0,153,255,.15);--framer-color-tint-extra-dark:#0077dd;--framer-font-family:Inter,system-ui,sans-serif}
#root input,#root select,#root button:not(.link){background:#1f1f1f;border:0;border-radius:8px}
#root button.framer-button-primary{background:#0099ff;color:#fff}
#root input[type=radio]{appearance:none;width:14px;height:14px;border-radius:50%;background:#2b2b2b;margin:2px 0 0;flex-shrink:0}
#root input[type=radio]:checked{background:#fff;box-shadow:inset 0 0 0 4px #0099ff}`
document.head.appendChild(theme)
document.body.style.cssText = "margin:0;background:#0E1014"
document.getElementById("stage")!.innerHTML = `
<div style="width:1600px;height:1000px;display:grid;grid-template-columns:1fr 448px;gap:80px;align-items:center;padding:0 130px;box-sizing:border-box;
  font-family:Inter,system-ui,sans-serif;color:#ECEDEE;background:radial-gradient(1200px 700px at 85% 50%,#1A1F2E 0%,#0E1014 70%)">
  <div>
    <div style="display:flex;align-items:center;gap:12px;font-size:26px;font-weight:650;letter-spacing:-.02em;margin-bottom:56px">
      <svg width="34" height="34" viewBox="0 0 48 48" fill="#8B9BFF"><rect x="7" y="9" width="27" height="8" rx="4"/><rect x="14" y="20" width="27" height="8" rx="4"/><rect x="7" y="31" width="27" height="8" rx="4"/></svg>SyncRoles</div>
    <div style="font-size:64px;font-weight:650;letter-spacing:-.045em;line-height:1.04">${title}</div>
    <div style="font-size:26px;line-height:1.45;color:#9BA1AD;margin-top:24px;max-width:640px">${sub}</div>
  </div>
  <div id="panel" style="zoom:1.4;width:320px;height:680px;border-radius:16px;overflow:hidden;background:var(--framer-color-bg);border:1px solid #2B303B;box-shadow:0 30px 80px rgba(0,0,0,.5);display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:8px;padding:12px 15px;font:600 12px Inter,system-ui;color:var(--framer-color-text)">
      <svg width="18" height="18" viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="#0E1014"/><g fill="#8B9BFF" transform="translate(7.2 7.2) scale(.7)"><rect x="7" y="9" width="27" height="8" rx="4"/><rect x="14" y="20" width="27" height="8" rx="4"/><rect x="7" y="31" width="27" height="8" rx="4"/></g></svg>SyncRoles</div>
    <div id="root" style="flex:1;min-height:0"></div>
  </div>
</div>`
createRoot(document.getElementById("root")!).render(<App projectId="demo" />)
