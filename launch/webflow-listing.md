# SyncRoles for Webflow: Marketplace listing and submission checklist

Drafted 21 Nov 2026. Not submitted yet.

## Listing copy (English, no beta wording, no "Webflow" in the app name)

**App name:** SyncRoles

**Tagline:** Your careers page, always in sync with your hiring tool.

**Short description:**
SyncRoles copies open roles from Lever, Greenhouse, Ashby or Personio into a Webflow CMS collection every 15 minutes, and removes roles you close. Only the job items are published. Your other unpublished changes stay unpublished.

**Long description:**
Recruiters post and close roles in the hiring tool. The careers page should follow by itself.

- Connect your site, pick your hiring tool and enter your public job-board name. No hiring-tool API key needed.
- SyncRoles creates a Jobs collection with fields for title, department, team, location, employment type, remote, compensation, description, job and apply links, and publish date. Bind them in your own template.
- Every 15 minutes it adds new roles, updates changed ones and removes closed ones.
- Publishing is per item: only the jobs go live. Pages and designs you have not published stay unpublished. You can also choose "sync only" and publish yourself.
- If your hiring tool returns no jobs at all while the site still has some, SyncRoles changes nothing and tells you. Outages don't empty your careers page.
- Items you typed in by hand are never touched.

**Requirements:** a Webflow site plan with CMS. The site must have been published at least once before SyncRoles can publish jobs; until then jobs are saved as staged items.

**Pricing (must be disclosed):** Free: manual sync. $99 per site per year for automatic sync. $249 per year for up to five sites (agencies).

**Category:** Data sync / CMS

**Support:** support email on syncroles.com (to set up), docs at https://syncroles.com/docs

## Scopes to request
- `sites:read` (list the sites the user authorised)
- `cms:read`, `cms:write` (create the Jobs collection and its items, publish items)
No Custom Code or Workspace scopes, so no extra explanation needed.

## Submission checklist (from Webflow's submission docs)
- [ ] App registered in the workspace (Workspace Settings > Apps & Integrations > Develop), type **Data Client**, redirect URI `https://syncroles.com/webflow/callback`
- [ ] Two-factor authentication on for an admin account of the workspace
- [ ] Installation URL that starts Webflow OAuth directly: `https://webflow.com/oauth/authorize?response_type=code&client_id=<CLIENT_ID>&scope=sites:read%20cms:read%20cms:write`
- [ ] Published testing site on `.webflow.io` with the app installed and all features visible: `https://syncroles-test.webflow.io` (needs a Jobs template and list built in the Designer)
- [ ] Three attestations: OAuth token encrypted at rest, stored server-side only, deleted on uninstall or revocation
- [ ] Logo, screenshots, demo video, privacy policy and terms links
- [ ] Review access for the reviewer (test hiring-tool handle they can use, e.g. a public Ashby board)

## Still to build before submitting
1. OAuth: `GET /webflow/install` (redirect to authorize), `GET /webflow/callback` (exchange code, encrypt and store token, never log it).
2. Table `webflow_sites` (site id, encrypted token, source, collection name, publish mode, licence) and runs logged like Framer sites.
3. Setup page after OAuth: pick site, hiring tool and handle, preview jobs, choose mode, run first sync.
4. Scheduler runs Webflow sites through `syncToWebflow` (already written, `apps/server/src/webflow.ts`, tested).
5. Disconnect button that deletes the token; on a 401 from Webflow, delete the token and mark the site disconnected (revocation).
6. Stripe: reuse the existing licence flow; a licence covers Framer or Webflow sites.
