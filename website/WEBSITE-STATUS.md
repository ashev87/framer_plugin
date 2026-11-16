# Website status

This file records where the project stands. The skill `build-website` reads it on every call and continues from there.

Status: ✅ done · 🔄 in progress · ⬜ open

| Phase | Name | Status | Date |
|---|---|---|---|
| 0 | Set up | 🔄 | 2026-11-16 |
| 1 | Foundation | ⬜ | |
| 2 | Research | ⬜ | |
| 3 | Copy | ⬜ | |
| 4 | Design direction | ⬜ | |
| 5 | Build | ⬜ | |
| 6 | Review and polish | ⬜ | |
| 7 | Launch | ⬜ | |
| 8 | Afterwards | ⬜ | |

## Starting point

- Existing website or brand: https://syncroles.com, a first plain version built on 16 Nov 2026 (source in `apps/server/public/`). Name and domain are decided (SyncRoles). No logo, brand colours or fonts chosen yet; the current blue and system font are placeholders.
- Main goal of the site: sell the yearly Auto-sync and Agency licences for the SyncRoles Framer plugin (buy buttons go to Stripe Checkout). Secondary: send people to the plugin in the Framer Marketplace.
- Hosting: already live. Static pages served by the Node server on Railway (`apps/server`), domain syncroles.com. A deploy is a push to the branch Railway builds from.
- Tools: impeccable ⬜ (install was blocked in the cloud session, see open questions) · Playwright ✅ (pre-installed, Node) · DataForSEO ✅ (connector available in the session) · hosting MCP ✅ (Railway connector) · form target: none needed, the site has no form

## Brand

| Role | Value |
|---|---|
| Main color | |
| Accent | |
| Light surface | |
| Text | |
| Headings | |
| Body text | |
| Distinguishing features | |

## Decisions

Every decision by the person with a date, so it does not get discussed again.

- 2026-11-16: Product name SyncRoles, domain syncroles.com.
- 2026-11-16: Prices $99 per site per year and $249 per year for five sites, tax added on top, yearly auto-renewal. Free tier: manual sync.
- 2026-11-16: Impressum and privacy contact use the SmartProcess Lab details (Andriy Shevchenko, Berlin).
- 2026-11-16: The hackathon traffic tracker script must stay in the `<head>` of every page and be described in the privacy page.

## Open questions for the person

- impeccable (the design plugin this process relies on) could not be installed from the cloud session: the installer was blocked by the session's safety settings. Either allow it, or continue without it and rely on a manual design review.

## Update procedure after launch

1. Change the pages in `apps/server/public/` (and `site-copy.md` once it exists)
2. Run the tests and build: `npm run build && npm test`
3. Upload: `git push` to the branch Railway deploys
4. Clear cache: pages are cached for 5 minutes, nothing to clear
5. Check live at https://syncroles.com
