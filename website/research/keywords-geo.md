# SyncRoles: keywords and GEO research

Measured 17 Nov 2026 with DataForSEO (Google, United States, English) and direct fetches of Framer Marketplace listings. Anything without a number was not measured or returned no data; nothing here is estimated.

## Read this first

1. **Google demand for this niche is close to zero.** Of 42 terms checked, 13 returned a volume, and only the generic ones exceed 50 searches a month. Every term that combines Framer with a hiring tool returned no data. The site should be written for the Marketplace visitor and for AI answers, not for Google volume.
2. **Two facts in the product brief are out of date** (details in section 3 and in `competitors.md`):
   - Lever now has a dedicated Framer plugin: "Lever Jobs" (`/marketplace/plugins/lever-sync/`), published 1 Nov 2026, $29 one-time, manual sync only.
   - Scheduled sync without opening Framer already exists for any JSON API: "Inlet" (published 3 Nov 2026, paid plans) and "Framer CMS Sync" (sync.framer.parts). ChatGPT already recommends Inlet for exactly the SyncRoles use case.
3. **The brand name collides with a programming term.** "syncRoles" is a method in Laravel's spatie/laravel-permission package and a function in Coder. Google's first page and ChatGPT's answer for "SyncRoles" are entirely about that.

## 1. Search volume

Sources: `G` = Google Ads search volume endpoint, `L` = DataForSEO Labs keyword overview. The Google Ads call returned only its first 10 rows through the tool, so the remaining terms were sent to Labs. "No data" means the term was sent and came back without a volume (Google Ads) or was absent from the Labs database, which in practice means too few searches to report. Competition is the Google Ads paid-competition level.

| Term | Monthly volume (US) | Competition | Source | Assessment |
|---|---|---|---|---|
| framer cms | 390 | LOW (0.26) | L | Navigational, owned by framer.com. Not a target; use as context word. |
| framer plugins | 260 | LOW (0.02) | L | Marketplace browsing. Reached through the listing, not the site. |
| framer api | 110 | LOW (0) | L | Developer intent. Not the buyer. |
| job board template | 90 | LOW (0.07) | L | People building a job board site. Wrong intent. |
| greenhouse job board api | 50 | LOW (0.22) | L | Developers building it themselves. Good subpage topic ("without writing code"). |
| framer cms api | 30 | LOW | G | Developer intent, framer.com ranks 1. Subpage topic at most. |
| framer server api | 20 | LOW (0.08) | L | Same. Mention once in "how it works" because AI answers cite the Server API. |
| greenhouse careers page | 20 | LOW (0.01) | L | Mostly navigational to Greenhouse. |
| framer job board | 10 | LOW | G | Best measurable niche term, but the results are job-board templates (see section 2). |
| framer job board template | 10 | not reported | L | Template intent. |
| framer careers page template | 10 | LOW (0.29) | L | Template intent; the template buyer is a later SyncRoles customer. |
| framer cms plugin | 10 | not reported | L | Fits the product category. Use in body copy. |
| careers page builder | 10 | not reported | L | Wrong audience (HR buying a builder). |
| lever postings api | 10 | LOW (0.16) | L | Developer intent. Subpage topic for the Lever page. |
| framer careers page | no data | | G | Use anyway: it is the phrase the audience uses. |
| framer careers template | no data | | G | |
| framer greenhouse | no data | | G | |
| framer greenhouse integration | no data | | G | Describes the offer best; results are weak (section 2). |
| framer ashby | no data | | G | |
| framer lever integration | no data | | G | |
| framer personio | no data | | G | |
| framer cms sync | no data | | G | Category term used by competitors ("Framer CMS Sync"). |
| framer cms automation | no data | | L | |
| sync job postings to website | no data | | L | |
| embed greenhouse jobs on website | no data | | L | |
| lever job board embed | no data | | L | |
| ashby careers page embed | no data | | L | |
| custom careers page greenhouse | no data | | L | |
| framer plugin job board | no data | | L | |
| auto publish framer | no data | | L | |
| framer cms scheduled publish | no data | | L | |
| framer lever | no data | | L | |
| framer ashby integration | no data | | L | |
| framer recruitee | no data | | L | |
| framer workable | no data | | L | |
| framer teamtailor | no data | | L | |
| ashby job board api | no data | | L | |
| framer notion sync | no data | | L | |
| framer airtable sync | no data | | L | |
| how to add job listings to framer | no data | | L | Question phrasing; use as FAQ wording. |
| framer job listings | no data | | L | |
| personio careers page | no data | | L | |

Google's related searches (from the result pages, no volumes): "Framer job board template", "Framer job board free", "Framer greenhouse plugin free", "Framer greenhouse plugin reddit", "Framer greenhouse plugin tutorial", "Framer greenhouse plugin review".

## 2. Google results for the two niche terms

Proposed niche terms: **"framer greenhouse integration"** (no measurable volume, but the phrase that describes the offer) and **"framer job board"** (10 a month). A third check, "framer greenhouse plugin", was run because the first result page was so weak.

Limits of the data: Google returned an AI Overview block for "framer greenhouse integration", "framer job board" and "framer greenhouse plugin", but it loads asynchronously and the tool returned no text or citations, so **what the AI Overview cites was not measured**. **No People Also Ask box appeared** on any of the three result pages. Result URLs came back as Google redirect links, so the URLs below are taken from the displayed breadcrumb and are complete only where I could confirm them.

### "framer greenhouse integration"

| Pos. | Page | URL | Type |
|---|---|---|---|
| 1 | How to Integrate with Greenhouse, ERIN Support Center | support.erinapp.com/knowledge/integrations-... | Article, unrelated (employee referral tool) |
| 2 | Greenhouse Webflow Integration, BRIX Agency | webflow.com/made-in-webflow/website/gr... | Provider, but for Webflow (cloneable) |
| 3 | FreeBusy Integration for Greenhouse | freebusy.io/integrations/greenhouse | Provider, unrelated (scheduling) |
| 4 | Framer Integration, Concord.Tech | concord.tech/product/integrations/fra... | Provider, unrelated (consent tool) |
| 5 | Greenhouse plugin for Framer CMS | https://www.framercms.com/plugins/greenhouse-cms-plugin | Directory entry pointing at the free Marketplace plugin |
| 6 | Infomart integration | support.greenhouse.io/hc/en-us/articles/36001... | Article, unrelated |
| 7 | Collage integration | support.greenhouse.io/hc/en-us/articles/36002... | Article, unrelated |
| 8 | Framer integration, Passionfruit SEO | getpassionfruit.com/Integrations | Provider, unrelated (SEO content) |
| 9 | Framer Developers | framer.com/developers/reference/plu... | Framer docs |

Only nine organic results were returned. Google has no good answer for this query: one result of nine is about Greenhouse jobs in Framer, and it is a 261-word directory stub. The official Greenhouse listing on the Framer Marketplace is not in the top nine.

### "framer job board"

| Pos. | Page | URL | Type |
|---|---|---|---|
| 1 | Workze, Free Website Template for Framer | framer.com/.../Templates/Services | Template |
| 2 | Framer Careers: Join our team | https://www.framer.com/careers/ | Framer's own careers page |
| 3 | Jobhub, Free Website Template for Framer | framer.com/.../Templates/Publishing | Template |
| 4 | Shifter, Free Website Template for Framer | framer.com/Marketplace/Templates | Template |
| 5 | Share your Framer Job Board Templates & Plugins | Reddit r/framer | Forum thread |
| 6 | Framer Job Board Template: JobHub | https://jobhub.framer.website | Template demo |
| 7 | Job Board, Component for Framer ($13) | https://www.framer.com/marketplace/components/job-board/ | Marketplace listing (component) |
| 8 | Jobs Board plugin for Framer | https://www.commoninja.com/widgets/job-listings/framer | Provider (embeddable widget) |
| 9 | Job Directory Framer Template for Career & Recruitment | framebite.com/Blog | Article about a template |

The intent behind "framer job board" is "I want to build a job board site", not "I want my company's open roles on my careers page". Templates take six of nine places. Under the Reddit result Google shows a sub-link titled "Built a job board for Framer that takes roles down by itself". I could not open it (Reddit is not reachable from here and the link is a redirect), so who posted it is not known. Check it by hand: it is either a competitor with the same promise or a SyncRoles launch post.

### "framer greenhouse plugin" (extra check)

Nothing relevant in the top nine: a Lemon Squeezy store (FramerDev), FeedbackJar, two Reddit threads about other plugins, a YouTube tutorial, a Wize Templates article on Framer integrations, a Framer demo site, EquipDash, and "10 Best Framer CMS Plugins and Tools in 2026" (yoframer.com/Resources, position 9, an article that lists sync and scheduled-publishing plugins and is worth getting into).

### What this means

There is no established page to beat. A page that actually states "Greenhouse, Lever, Ashby and Personio jobs in Framer CMS, synced every hour" in its title and H1 would be the only on-topic result for the hiring-tool queries. The traffic to win is small.

## 3. ChatGPT answers (web search forced, US, 17 Nov 2026)

### (a) "How do I keep the jobs on my Framer careers page in sync with Greenhouse or Lever automatically?"

Summary: ChatGPT lays out three routes.
1. A Framer plugin (called easiest): the Greenhouse plugin for Greenhouse and "Lever to Framer Sync" for Lever. It adds a warning: "don't assume they both run continuously in the background. Lever Sync, in particular, describes a user-initiated sync."
2. Scheduled API synchronisation, labelled "My recommendation for hands-off syncing": **Inlet**, described as supporting scheduled sync, webhook sync, field mapping from JSON APIs and optional Framer publishing after scheduled syncs, with the note that scheduled and webhook features need a paid plan and write to a separate server-managed collection.
3. A custom backend using the hiring tool's API and the Framer Server API, checking every 5 to 15 minutes.

It then suggests a `Jobs` collection schema, says to use the hiring tool's job ID as the unique key so a title change does not create a duplicate, and says closed positions must be removed, not hidden. It ends by asking whether Framer should publish automatically or wait for review.

Sources and brands named: framer.com/marketplace/plugins/greenhouse/, framer.com/marketplace/plugins/lever-sync/, framer.com/marketplace/plugins/inlet/ (cited three times, once with an affiliate parameter), framer.com/developers/server-api-introduction, support.greenhouse.io (API overview; "Choose a careers page integration option"). Images came from framerspace.io and softwarefinder.com. SyncRoles is not mentioned.

### (b) "Is there a Framer plugin that syncs Lever job postings into the CMS on a schedule?"

Summary: "Yes, there are now Framer plugins for this, but there's an important distinction: the dedicated Lever plugin currently requires manual syncing, while other plugins support scheduled syncing." Three options:
1. **Lever Sync** (Framer Marketplace, published November 2026): imports postings, maps fields, no duplicates, handles closed jobs. "Limitation: Sync is user-initiated. No automatic scheduled sync."
2. **Inlet**, "Best fit for scheduled syncing": REST API to Framer CMS, scheduled sync on Pro and Business, webhooks, can publish after scheduled syncs. Caveat given: you must verify the Lever API response and job-removal behaviour yourself.
3. **Framer CMS Sync** by Framer Parts (sync.framer.parts): REST APIs, scheduled imports, webhooks, run history.

It recommends Inlet first, shows the public Lever endpoint `https://api.lever.co/v0/postings/YOUR_COMPANY?mode=json`, and repeats that closed jobs must be removed and Lever's posting ID used against duplicates.

Sources and brands named: framer.com/marketplace/plugins/lever-sync/, framer.com/marketplace/plugins/inlet/, sync.framer.parts, brixtemplates.com/blog/how-to-build-a-framer-careers-page-with-levers-postings-api/. SyncRoles is not mentioned.

### (c) "What is SyncRoles?"

Summary: "SyncRoles does not appear to identify one widely recognized standalone software product." ChatGPT explains it as a programming term: role synchronisation in identity management (Microsoft Entra ID, Okta), the `SyncRoles` function in Coder, and Laravel's `syncRoles()` method. It asks where the user saw the name.

Sources: pkg.go.dev (coder/coder idpsync), laraplugins.io (litepie/roles).

Other uses of the name on the web: Google's first page for "syncroles" is entirely Laravel: spatie.be laravel-permission docs (positions 1 and 6), GitHub issues and discussions of spatie/laravel-permission (2, 4), Stack Overflow (3), 42mate blog (5), a YouTube tutorial (7), a Filament plugin (8), Roundly Consulting docs (9). Related searches are all Laravel. No company or product named SyncRoles or "Sync Roles" appeared in the results or in ChatGPT's answer. syncroles.com was not in Google's top nine one day after launch, and `/marketplace/plugins/syncroles/` returned "Plugin unavailable" on 17 Nov 2026 (the listing may be under another address or not yet approved).

### What the three answers mean

- AI search already frames the question the way SyncRoles does (manual versus unattended) and already has an answer for the unattended case. SyncRoles has to be the hiring-tool-specific answer: no field mapping, no API reading, closed roles removed, publishing handled safely.
- The points ChatGPT says the reader must verify with Inlet (job removal, duplicates, publishing) are the points SyncRoles should state as facts.
- For the brand question, always write the name with its category on first mention: "SyncRoles, the Framer plugin that syncs job postings". Never rely on the bare name.

## 4. Keyword map for the landing page

One term per place. Volumes are near zero everywhere, so terms are chosen for match with how the audience and the AI answers phrase the problem.

| Place | Term | Note |
|---|---|---|
| Page title | framer careers page (plus "sync jobs from Greenhouse, Lever, Ashby, Personio") | e.g. "SyncRoles: keep your Framer careers page in sync with Greenhouse, Lever, Ashby and Personio". Brand plus category in one line fixes the name collision. |
| Meta description | sync job postings to Framer CMS | Include "every hour", "closed roles removed", "nobody has to open Framer", and the price. |
| H1 | open roles / Framer careers page in sync | The positioning sentence. Keep "hiring tool" next to the four product names. |
| Hero, comparison with free plugins | free Greenhouse / Ashby / Personio / Recruitee plugin (manual sync) | The words the visitor already knows from the Marketplace: "Sync with Greenhouse", "single click". Related search: "framer greenhouse plugin free". |
| How it works | Framer CMS collection (scheduled sync, Framer Server API) | Name the Server API once; ChatGPT cites it as the mechanism that works without the editor open. |
| Publishing safety | auto-publish Framer (unpublished changes) | The phrase competitors use is "auto-publish". The fear is worded on a competing listing as "also publishes any other unpublished changes on the site". |
| Supported hiring tools | framer greenhouse integration | Also carries "Framer Lever integration", "Framer Ashby", "Framer Personio" as the four sub-headings. Lever mention: scheduled, which the Lever plugin on the Marketplace is not. |
| Pricing | Framer plugin pricing per site (agency licence) | "$99 per site per year", "$249 per year for five sites". Competitors price per site or per project, so use "site". |
| FAQ 1 | Do the free Greenhouse and Ashby plugins sync automatically? | The paying question. |
| FAQ 2 | Does SyncRoles publish my site? What happens to unpublished changes? | Trust concern 1. |
| FAQ 3 | What happens when a role is closed in the hiring tool? | "Ghost jobs" is the word the Lever plugin's site uses. |
| FAQ 4 | Is there a Framer plugin for Lever that syncs on a schedule? | Exact ChatGPT question (b). |
| FAQ 5 | What happens to my API key? Do I need an API key from Greenhouse, Lever, Ashby or Personio? | Trust concern 2; competitors stress "no API key from the hiring tool". |
| FAQ 6 | How often does it sync? | "Every hour" as a plain fact. |
| FAQ 7 | How is this different from Inlet or a custom Framer Server API script? | New question from the ChatGPT answers. |
| FAQ 8 | Can I use it on several client sites? | Agency licence. |
| FAQ 9 | What is SyncRoles? | Brand definition sentence for AI search. |

## 5. GEO measures for this product

**Fact sentences.** Short, self-contained, with the subject named, so they can be quoted without context. Write these on the page in plain text (not inside images or tabs):
- "SyncRoles is a Framer plugin with a hosted service that copies open roles from Greenhouse, Lever, Ashby or Personio into a Framer CMS collection."
- "On the paid plans SyncRoles syncs every hour without anyone opening Framer."
- "Roles closed in the hiring tool are removed from the Framer CMS collection at the next sync."
- "SyncRoles does not publish the site unless you turn publishing on."
- "The free plan syncs when you click Sync in the plugin."
- "Auto-sync costs $99 per site per year. The Agency licence costs $249 per year for five sites."
- "SyncRoles launched on 16 November 2026."
Only state "four tools" if all four work at launch, and say nothing about failure alerts (per PRODUCT.md).

**Name disambiguation.** Because "syncRoles" is a Laravel method, put the category next to the name everywhere a machine reads it: title tag, H1 area, meta description, `Organization`/`SoftwareApplication` name plus `description`, Marketplace subtitle, llms.txt first line. Add one FAQ entry "What is SyncRoles?" and, if wanted, one line "Not related to the syncRoles() method in Laravel."

**Same facts on the Marketplace listing and the site.** ChatGPT cited Marketplace listings in every answer and cited no vendor site except sync.framer.parts. The listing is the primary GEO surface. It should carry, word for word, the first line of the site, the sync interval, the removal of closed roles, the publishing rule, the list of hiring tools, the price, and the manual-versus-scheduled sentence. ChatGPT picked up the Lever plugin's limitation directly from its listing ("100% User-Initiated"), and Inlet's strength from its listing ("syncs on a schedule from its server, so you don't need Framer open"). Write the equivalent sentence into the SyncRoles listing. Framer generates `Product` structured data with price for each listing from the listing fields, so the price field should be filled.

**Structured data on syncroles.com.**
- `SoftwareApplication` (applicationCategory "BusinessApplication" or "DesignApplication", operatingSystem "Web", `offers` for Free, $99 per year and $249 per year). No `aggregateRating` or `review`: there are none.
- `FAQPage` for the FAQ, with the questions exactly as on the page.
- `Organization` with name, url, and `sameAs` to the Marketplace listing and creator profile.
- `HowTo` is optional for the setup steps; `BreadcrumbList` once subpages exist.

**FAQ with real questions.** Use the questions from section 4. They come from the two ChatGPT prompts, the caveats ChatGPT attached to competitors, and the wording of competing listings. No People Also Ask questions exist for these terms, so there is nothing to copy from Google.

**llms.txt.** At `https://syncroles.com/llms.txt`: one-line definition with category, the fact sentences above, supported hiring tools, prices, what the free plan does, how publishing is handled, what is stored (API key encrypted, deletable from the plugin), links to the Marketplace listing, pricing, FAQ and later the per-tool pages. Keep it in sync with the page; a contradiction between llms.txt, listing and site is worse than not having the file.

**Get cited where the answers come from.** In order of observed influence: the Framer Marketplace listing; a Framer Community post; r/framer (Google shows Reddit sub-links for "framer job board" and "framer greenhouse plugin reddit" is a related search); roundup articles such as yoframer.com "10 Best Framer CMS Plugins and Tools in 2026" and the framercms.com plugin directory, which has entries for the Ashby, Lever and Greenhouse plugins.

**Crawler access.** Allow GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot and Google-Extended in robots.txt, and render the fact sentences in the HTML, not only after JavaScript runs.

## 6. Topics for later subpages

- One page per hiring tool: "Greenhouse to Framer CMS", "Lever to Framer CMS", "Ashby to Framer CMS", "Personio to Framer CMS". Each: what the free plugin for that tool does and when it syncs, what SyncRoles adds, which fields arrive, the job-board address needed for setup. The Lever page compares with the $29 manual Lever plugin.
- "SyncRoles vs the free Framer job plugins" (Greenhouse, Ashby, Recruitee, Personio Sync, Workable Sync): manual versus scheduled, one table.
- "SyncRoles vs Inlet vs a custom Framer Server API script": generic API sync against a hiring-tool-specific one.
- "How publishing works": only-jobs-changed mode, what happens with unpublished page edits. The strongest trust topic and one no competitor explains in depth.
- "For agencies": five-site licence, client sites, what the client has to provide.
- "How to add job listings to a Framer careers page" (guide: collection schema, job detail pages, apply links). ChatGPT writes this schema itself; a page that provides it can be cited.
- "Greenhouse Job Board API / Lever Postings API with Framer, without code" (catches the 50 and 10 a month developer searches).
- "Security and data": what is stored, encryption of the API key, deletion.
- Later, if supported: Workable, Recruitee, Teamtailor pages (no volume data for any of them).
- Changelog page with dates, so AI answers can state when a hiring tool was added.

## Not measured

- AI Overview text and citations (returned empty by the tool for all three queries).
- People Also Ask (none shown).
- Volumes for 29 of 42 terms (no data returned).
- The Reddit post "Built a job board for Framer that takes roles down by itself" (not reachable).
- Answers from Perplexity, Gemini and Claude (only ChatGPT was asked).
- DataForSEO cost: the tools did not report it.
