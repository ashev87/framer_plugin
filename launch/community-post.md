# Draft post for the Framer Community

**Title:** I built a plugin that keeps a careers page in sync with Lever, Greenhouse, Ashby or Personio

Hi all,

Careers pages built in Framer tend to go stale: a role closes in the hiring tool and stays on the site until someone remembers to update it.

I built SyncRoles for that. You enter your company's job-board address, it creates a Jobs collection in the CMS, and you design the page from it. Syncing from the plugin with a click is free. With a licence it syncs every 15 minutes from a server, so nobody has to open Framer.

Two things I cared about while building it:

- Publishing in Framer publishes everything, including half-finished design work. SyncRoles never publishes unless you pick a mode that allows it, and one mode only publishes when no page has other unpublished changes.
- If the job board is down or suddenly returns nothing, it does not empty your page. It stops and asks.

It is brand new, so I would like to hear what breaks, which hiring tool you are missing, and whether the publishing modes make sense for client work.

Plugin: https://www.framer.com/marketplace/plugins/syncroles/
Site and setup guide: https://syncroles.com
