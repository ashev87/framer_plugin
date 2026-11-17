# SyncRoles: competitor research

Measured 17 Nov 2026. Google data: DataForSEO, United States, English. Framer Marketplace listings were fetched directly from www.framer.com; other pages were read with DataForSEO page parsing. Word counts are approximate and, for Marketplace listings, include the "Related Plugins" block that Framer adds. Nothing is estimated; gaps are marked "not measured".

## Findings that affect the positioning

1. **Lever has a dedicated Framer plugin since 1 Nov 2026.** "Lever Jobs" (`https://www.framer.com/marketplace/plugins/lever-sync/`, by Agent Weave AI, $29 lifetime licence per project). It is manual only, so SyncRoles can still say it is the scheduled option for Lever, but "Lever has no dedicated Framer plugin" is no longer true and must not appear on the site.
2. **Scheduled sync without opening Framer is not unique.** "Inlet" (published 3 Nov 2026) syncs any JSON API into Framer CMS "on a schedule from its server, so you don't need Framer open" on its paid plans and can publish after each sync. "Framer CMS Sync" (sync.framer.parts) offers scheduled and webhook sync for any REST API. ChatGPT already recommends Inlet for syncing Greenhouse or Lever jobs. The positioning sentence compares only with the free plugins, which stays true, but the page needs an answer to "why not Inlet": no field mapping or API knowledge needed, closed roles removed, publishing handled safely, made for hiring tools.
3. **No free job plugin's listing mentions a schedule, but none says "manual only" either, and three use the word "automatic".** See the quotes in part 2. The claim "the free plugins sync only when someone opens Framer and clicks" is supported by the listing wording for Greenhouse and Recruitee ("with a single click"), is consistent with Ashby, and is **not confirmed by the Personio Sync listing**, which says "Automatically sync ... without any manual work" and gives no trigger. Verify Personio Sync (and ideally all four) by installing them before the comparison goes live.
4. **The free Personio plugin is not by Framer.** Greenhouse, Ashby and Recruitee are published by Framer itself. "Personio Sync" is by Trueform, who also publish free "Workable Sync" and "Gem Sync" plugins. So there are at least six free job plugins, not four.
5. **KnotCMS already uses SyncRoles' argument almost word for word** for Notion: "Framer's plugin only syncs when someone opens Framer and clicks sync." It syncs every minute, includes auto-publish on its free tier, and costs $85 a year for one site. Hourly sync at $99 a year will be compared with that.
6. Two tools in the brief are not scheduled-sync tools according to their listings: **AnySync** is one-click manual sync with a one-time price, and **FrameRewind** is a CMS backup tool. `/marketplace/plugins/cms-auto-publish/` returned "Plugin unavailable" (wrong address or delisted; not found).

## Part 1. Top 3 on Google: why they rank

### Which pages qualify

Niche terms: "framer greenhouse integration" (no measurable volume) and "framer job board" (10 searches a month in the US). Full result lists are in `keywords-geo.md`.

Honest result: **almost nothing comparable ranks.** For "framer greenhouse integration", eight of nine results are unrelated (other tools' Greenhouse or Framer integrations). For "framer job board", six of nine are templates. No vendor of a job-sync plugin has a site in either top nine, and the official Greenhouse listing on the Framer Marketplace is not in the top nine for "framer greenhouse integration". The three best-placed pages that offer something to the same audience are:

| # | Page | Position and term | Comparable? |
|---|---|---|---|
| A | framercms.com, "Greenhouse plugin for Framer CMS" | 5 for "framer greenhouse integration" | Borderline: an independent directory entry that describes and links the free Greenhouse plugin. Included because it is the only on-topic result. |
| B | Framer Marketplace, "Job Board" component | 7 for "framer job board" | Marketplace listing, paid ($13). A display component, no sync. |
| C | Common Ninja, "Jobs Board plugin for Framer" | 8 for "framer job board" | Vendor page. An embeddable widget where jobs are typed in by hand, no hiring-tool connection. |

### A. framercms.com/plugins/greenhouse-cms-plugin

- **Position and term:** 5, "framer greenhouse integration".
- **Title:** "Greenhouse plugin for Framer CMS · framer-cms"
- **Meta description:** "Marketplace plugin connecting Greenhouse jobs to Framer CMS collections."
- **H1:** "Greenhouse plugin for Framer CMS"
- **H2:** none. H3: "Why we picked it", "What you'll learn", "Who it's for", "Related tutorials". H4: "Open this article at the source" and three related plugin entries.
- **Where the main term appears:** "Greenhouse" and "Framer" in the URL, title, H1, meta description and first sentence. The word "integration" does not appear in the title or H1; Google matched it anyway.
- **Variants and related terms:** "Greenhouse jobs", "Framer CMS collections", "Sync openings into CMS", "careers experience", "ATS", "Ashby and Lever", "manual job updates".
- **Topics and questions covered:** what the plugin is, who it is for ("Orgs standardized on Greenhouse"), four bullet promises. No how-to, no sync timing, no pricing, no limits.
- **Word count:** about 260.
- **FAQ:** no.
- **Structured data:** not detected by the tool. Open Graph type "article", article:author "Framer Marketplace".
- **Why it ranks:** exact topical match in URL, title and H1 on a site entirely about Framer CMS, in a result set with no competition. Not content depth.

### B. framer.com/marketplace/components/job-board/

- **Position and term:** 7, "framer job board".
- **Title:** "Job Board — Component for Framer"
- **Meta description:** "Editorial-Style Job Board — Job Board is a premium Cards component for Framer, on the Framer Marketplace. Build on it with Framer's agent, directly on the canvas."
- **H1:** "Job Board"
- **H2:** "About Job Board", "From Noor Afzal", "Related Components".
- **Where the main term appears:** exact product name, so it is in the URL, title, H1, meta description and first sentence ("Editorial Job Board is a premium Framer Code Component designed for modern careers pages...").
- **Variants and related terms:** "careers pages", "hiring platforms", "recruitment agencies", "job listings", "featured roles", "remote job boards", "startup careers pages", "View Role / apply links", "filter by location", "filter by category".
- **Topics covered:** design (bento layout), a feature list of 18 items, an "Ideal For" list of 10 use cases. Jobs are entered by hand in Property Controls. Nothing about where the job data comes from.
- **Word count:** about 360.
- **FAQ:** no.
- **Structured data:** `Product` with `Offer` (price 13, USD, seller) and `BreadcrumbList`, generated by Framer.
- **Why it ranks:** framer.com domain strength plus the exact term as the product name.

### C. commoninja.com/widgets/job-listings/framer

- **Position and term:** 8, "framer job board". Google shows a rating snippet "5.0 (323) · Free".
- **Title:** "Jobs Board plugin for Framer"
- **Meta description:** "Create your personalized Framer Jobs Listings plugin. It's free, easily customizable & mobile-friendly."
- **H1:** "Job Listings for Framer"
- **H2:** the subline (set as an H2), "Design your Job Listings right here", "Why Should You Use the Job Listings Widget+?", "Customizable Job Fields", "Dynamic Custom Fields", "Comprehensive Job Insights", "Visual Element Addition", "Interactive Location Insights", "Select from multiple skins", "Complete Customization Control", "Jobs Board Advanced CSS Customization", "Effortless Installation on Framer websites", "How to add Job Listings to Framer", "Compatible With All Site Builders, E-Commerce Platforms and Websites". H3 below them: "Streamlined Job Management on Framer websites", "Targeted Applicant Reach with Job Board for Framer", "Efficient Application Process", "Custom Job Views", "Filtered Job Search", "Sortable Job Listings", "User-Friendly Integration", "FAQ".
- **Where the main term appears:** title ("Jobs Board plugin for Framer"), H3 ("Job Board for Framer"), repeatedly in body copy as "Jobs Board plugin for Framer" and "Framer Jobs Board plugin". The H1 uses the variant "Job Listings for Framer".
- **Variants and related terms:** "job listings", "jobs board widget", "job openings", "job postings", "Framer website", "Framer plugin", "candidates", "applicants", "filters", "skins", "CSS".
- **Topics and questions covered:** managing postings by hand, custom fields, filters and sorting, maps, images, skins, installation steps, 15 FAQ answers (what it is, coding needed, customisation, responsive, images, filters, sorting, maps, integration, SEO, CSS, trial, support, compatibility, updates).
- **Word count:** about 1,300.
- **FAQ:** yes, 15 entries.
- **Structured data:** not returned by the parsing tool. The star rating in Google's snippet shows the page carries rating markup of some kind; exact type not measured.
- **Why it ranks:** a programmatic page (the same widget page exists per platform), long, with the term in the title and many headings, on a domain that ranks for many "framer + widget" terms.

### Ranked keywords of those domains (US, relevant ones only)

**framercms.com** (22 ranked keywords in total, all between positions 35 and 85): "framer cms" 390/month at position 44; "framer layouts" 390 at 53; "framer plugins" 260 at 51; "framer code" 260 at 57; "cms framer" 50 at 41; "what is cms in framer" 50 at 48; "cms plugins" 40 at 35; "framer cms api" 30 at 35; "framer integrations" 30 at 64; "framer hubspot integration" 20 at 73. No keyword containing greenhouse, lever, ashby, job or careers is recorded for the domain.

**framer.com** (filtered to job, career and hiring-tool terms; 21 matches): "framer careers" and "framer career" 260 at position 1 (Framer's own jobs); "framer cms api" 30 at position 1 (framer.com/developers/cms); "ashby extension" 110 at 46, "ashby chrome extension download" 40 at 29 and "ashby marketplace" 10 at 38, all landing on the Ashby plugin listing by accident; "recruitment website template" and five close variants, 70 each, positions 33 to 48, on recruitment templates. The Greenhouse, Recruitee and Lever listings have no recorded ranking keyword.

**commoninja.com** (filtered to Framer and job terms; 32 matches): "internet job board" 9,900 at 64; "google jobs job board" 320 at 18; "create a job board website" 70 at 13; "create job board website" 70 at 12; "creating a job board" 70 at 19; "how to create a job board website" 40 at 16; "job board open source" 40 at 19; "job listing plugin for wordpress" 40 at 6; "framer widgets" 40 at 4; "framer forms" 210 at 5. No recorded ranking for "framer job board" in the keyword database despite position 8 in the live result (the term is too small to be tracked).

### Commonalities

- The exact phrase or a near variant sits in the URL, title and H1. That alone is enough in this niche.
- All three name "Framer" plus the object ("Greenhouse", "Job Board", "Job Listings") in the first sentence.
- None explains how the data stays current. A and B say nothing; C describes editing jobs by hand in its own editor.
- None shows a price on the page text that is tied to a time period, none shows a process with real steps for a hiring tool, none has customer proof specific to the product (C shows "loved by 500K+ businesses" for the whole company).
- Two of three are short (260 and 360 words). Length is not what ranks here.

### Gaps (questions none of the three answers)

From the ChatGPT answers, competing listings and the keyword table; Google showed no People Also Ask box for these terms.

1. Do the free Greenhouse, Ashby, Recruitee and Personio plugins sync by themselves, or only when someone clicks?
2. How do I keep the careers page current without opening Framer?
3. What happens to a role that is closed in the hiring tool? (ChatGPT stresses this in both answers.)
4. Will an automatic sync publish my unfinished page edits?
5. Is there a scheduled sync for Lever? (ChatGPT answers "the Lever plugin is manual, use a generic API tool".)
6. Do I need an API key from the hiring tool, and where is it stored?
7. How are duplicates avoided when a job title changes?
8. Which fields arrive in the CMS (department, location, employment type, description, apply link)?
9. What does it cost per site and for agencies with several client sites?
10. How does a hiring-tool-specific sync differ from Inlet, Framer CMS Sync or a custom Server API script?

### Structure guidance for the SyncRoles page

- **Title and H1** must contain "Framer", "careers page" or "jobs", and the names Greenhouse, Lever, Ashby, Personio. That matches every hiring-tool query at once; no ranking page does this.
- **Sections, in this order:** hero with the manual-versus-scheduled comparison; how it works in three or four numbered steps (the pattern every strong listing uses); publishing safety; supported hiring tools with one short block each; pricing; FAQ of 8 to 10 questions taken from the gap list.
- **Length:** 700 to 1,000 words is enough. The ranking pages have 260 to 1,300 words and the long one is padding. Depth should go into the FAQ and later into one page per hiring tool.
- **Each hiring tool gets its own H2 or H3** with the phrase "Greenhouse to Framer CMS" and so on, as anchors now and subpages later.
- **State the sync trigger as a sentence**, because that is what ChatGPT quoted from competing listings.
- **Structured data:** `SoftwareApplication` with offers and `FAQPage`. None of the three has an FAQ about the actual problem.

### New terms for the keyword map

"Framer CMS collection", "synced collection" (Trueform's wording), "careers page" (used by all free listings; more common than "job board" for this intent), "job listings", "open roles / openings", "company handle" and "job-board address" (what setup asks for), "single click" (the free plugins' own phrase, useful in the comparison), "auto-publish" (KnotCMS, Inlet), "Framer Server API key", "ghost jobs" (Lever plugin site), "ATS" (use once; ChatGPT and directories use it, the audience says "hiring tool"), "Framer greenhouse plugin free" (related search), "scheduled sync", "user-initiated sync" (ChatGPT's wording for the manual plugins).

## Part 2. How competitors convince visitors

### When each free job plugin syncs: the exact wording

This is the difference SyncRoles' claim rests on. All quotes are from the Marketplace listings as fetched on 17 Nov 2026.

| Plugin | Publisher, price, dates | What the listing says about syncing | Scheduled option mentioned? |
|---|---|---|---|
| Greenhouse `/marketplace/plugins/greenhouse/` | Framer, free. Published 26 Jun 2025, updated 24 Aug 2025 | Heading "Automatic Greenhouse Sync". Text: "After a simple one-time setup with your company handle, keeping your careers page current becomes effortless. Add new positions or remove filled roles with a single click—no manual updates required." | No. "With a single click" means a person triggers it. "Manual only" is not stated in those words. |
| Ashby `/marketplace/plugins/ashby/` | Framer, free. Published 4 Aug 2025, updated 9 Oct 2026 | Heading "Simple Setup, Effortless Updates". Text: "Just enter your Ashby company handle once. From there, syncing new roles or removing filled positions takes seconds. Your site stays aligned with your live job board at all times." | No. No trigger is named; "takes seconds" implies an action by the user, "at all times" suggests otherwise. Ambiguous. |
| Recruitee `/marketplace/plugins/recruitee/` | Framer, free. Published and updated 24 Aug 2025 | Heading "Automatic Recruitee Sync". Text: "Keep your listings automatically updated: publish new jobs, archive filled positions, and ensure your careers page always reflects your latest openings with a single click." | No. "With a single click" again. |
| Personio Sync `/marketplace/plugins/personio-sync/` | Trueform, free. Published and updated 20 Mar 2026 | "Automatically sync your open job listings from Personio directly into your Framer CMS. The plugin reads from Personio's public XML feed, meaning there's no API setup, no credentials, and no authentication required ... keeping your careers page always up to date without any manual work." | No schedule or server is mentioned, and no click either. The listing does not say when it syncs. **Not confirmed as manual; test it.** |
| Workable Sync `/marketplace/plugins/workable-sync/` | Trueform, free. Published 27 Oct 2025 | "This plugin allows you to sync your open jobs that are stored inside Workable directly into your Framer CMS as a Synced Collection." | No. No trigger named. |
| Lever Jobs `/marketplace/plugins/lever-sync/` | Agent Weave AI, $29 lifetime. Published 1 Nov 2026, updated 7 Nov 2026 | "100% User-Initiated (No Recurring Servers). There are no third-party databases, background bots, or hidden server costs. You control when syncs happen right from Framer's editor." and "Sync Anytime: Click Sync Now whenever your recruiting team publishes new openings in Lever!" | Explicitly none on the listing. Its own site says in one place "unlimited manual or scheduled CMS updates forever", which contradicts the listing. |

Conclusion: no free job plugin advertises scheduled or server-side sync. But the free listings sell themselves with "automatic", "at all times" and "always up to date". A visitor who has read those will not believe "they only sync when you click" unless the SyncRoles page explains it: Framer plugins run inside the editor, so a plugin without its own server can only sync while someone has Framer open. KnotCMS and Inlet both make this point on their listings. Since the wording of the listings alone does not prove manual-only for Ashby, Personio Sync and Workable Sync, confirm by installing them before naming them.

### Page by page

**1. Greenhouse, free plugin by Framer** (`framer.com/marketplace/plugins/greenhouse/`)
- H1: "Greenhouse". Subline: "Sync with Greenhouse".
- Buttons: "Open Plugin" (twice).
- Trust signals: publisher is Framer itself; published and updated dates; "License Limited". No reviews or install counts shown.
- Process shown: one sentence ("one-time setup with your company handle").
- Concrete numbers: none.
- FAQ: no. Price: free (structured data price 0).
- Tone: marketing adjectives ("seamless", "stunning", "pixel-perfect", "effortless").
- The Ashby and Recruitee listings follow the same three-paragraph template (overview, sync, CMS field types) with about 190 to 220 words each. Ashby is the only one updated in 2026.

**2. Personio Sync, free plugin by Trueform** (`framer.com/marketplace/plugins/personio-sync/`)
- H1: "Personio Sync". Subline: "Personio Sync" (the name repeated).
- Buttons: "Open Plugin".
- Trust signals: explains the mechanism ("reads from Personio's public XML feed"), "no API setup, no credentials, and no authentication required". Publisher has two more job plugins.
- Process shown: "just paste your Personio subdomain".
- Concrete numbers: none. FAQ: no. Price: free.
- Tone: plain, one paragraph, about 75 words of description.

**3. Lever Jobs, paid plugin by Agent Weave AI** (`framer.com/marketplace/plugins/lever-sync/` and `lever-to-framer.pages.dev`)
- Listing H1: "Lever Jobs". Subline: "Lever to Framer Sync". Site H1: "Instant Lever to Framer CMS Sync. Zero Servers."
- Buttons: "Open Plugin", "Get Lifetime License Key Only USD 29", "Grab Your License Key".
- Trust signals: "Safety Guard: The plugin will never delete or archive jobs if a network request is interrupted or incomplete"; "100% Client-Side Privacy"; no API key needed; licence via Polar; support e-mail (a Gmail address); "typically respond within 24 hours". No customers named; "Top Framer agencies have documented..." is unsourced.
- Process shown: four numbered steps (Connect, Map Fields, Import, Sync Anytime), plus a diff preview (Added, Updated, Unchanged, Removed) before anything is written.
- Concrete numbers: $29 one-time "down from $69", "60 seconds", "10-Second In-Canvas Sync", "$20 to $100+ every month" for Make or Zapier.
- FAQ: on the site, six questions (server needed, API key needed, licence activation, closed roles, field mapping, support).
- Tone: loud, emoji headings, superlatives, urgency pricing.
- Turns the absence of a server into the selling point. SyncRoles makes the opposite case, so the page should say why a server is needed: without one, nobody syncs while Framer is closed.

**4. Inlet, paid scheduled sync for any JSON API** (`framer.com/marketplace/plugins/inlet/`)
- H1: "Inlet". Subline: "Sync any JSON API into Framer CMS".
- Buttons: "Open Plugin".
- Trust signals: the most precise data statement of all pages. Manual sync "runs entirely in your browser ... your credentials and API responses never pass through Inlet's server"; for scheduled sync "your request settings, including auth headers, are stored encrypted on Inlet's server"; "does not collect your Framer account or contact details". It also discloses a limitation: scheduled syncs "write to a separate server-managed collection named 'Inlet' ... because Framer only lets the plugin that created a collection update it."
- Process shown: "Paste a URL, pick the fields you want".
- Concrete numbers: none. Plan names "Pro and Business"; prices not stated on the listing (not measured).
- FAQ: no. Tone: factual, about 250 words.
- Key sentence: "On Pro and Business, Inlet syncs on a schedule from its server, so you don't need Framer open. ... You can also choose to publish the site after each scheduled sync."

**5. KnotCMS, paid scheduled sync for Notion** (`framer.com/marketplace/plugins/knotcms/`)
- H1: "KnotCMS". Subline: "Sync Notion to your Framer CMS." First line: "Let clients update your Framer site from Notion, without giving them access to Framer."
- Buttons: "Open Plugin"; link to a setup video.
- Trust signals: "Edits land as drafts, so nothing goes live by accident. Publish yourself, or turn on auto-publish and let the site update itself." Explains why setup is in the browser. Updated 15 Nov 2026.
- Process shown: three numbered steps, including "You'll paste a Framer Server API key here, which takes about a minute."
- Concrete numbers: Free: 1 site, 10 syncs in total, up to 50 CMS items per sync, syncs every minute, auto-publish. Starter $9/month or $85/year, 1 site. Studio $39/month or $390/year, 5 sites. Agency $99/month or $990/year, 20 sites.
- FAQ: no. Tone: plain, short sentences, written for agencies.
- Comparison sentence: "Different from Framer's Notion plugin: Framer's plugin only syncs when someone opens Framer and clicks sync. KnotCMS runs on its own servers, so content updates while Framer is closed."
- SyncRoles at $249 a year for five sites is cheaper than KnotCMS Studio ($390 for five), and dearer for one site ($99 against $85) with hourly instead of per-minute sync.

**6. Common Ninja, Jobs Board plugin for Framer** (`commoninja.com/widgets/job-listings/framer`)
- H1: "Job Listings for Framer". Subline: "Create job listings with a jobs board widget that lets you post openings, manage roles easily, and help candidates find the right positions quickly."
- Buttons: "Create Jobs Listings"; live editor on the page ("Try the editor, no signup").
- Trust signals: "loved by 500K+ businesses", four named faces, "No credit card · Free forever plan", rating 5.0 (323) in Google's snippet.
- Process shown: "How to add Job Listings to Framer" steps.
- Concrete numbers: 500K+ only. Price: free plan stated; paid prices not on the page.
- FAQ: 15 generic entries (one answer reads "Please check with the specific provider of the Jobs Board Widget", which shows the text is templated).
- Tone: generic, repetitive, written for search engines.

**Also seen**
- **Framer CMS Sync** (`sync.framer.parts`, named by ChatGPT). H1: "Framer CMS Sync for APIs, Airtable, Google Sheets, and Notion". Subline: "Connect external data to Framer CMS with preview, field mapping, schedules, webhooks, and run history built for repeatable publishing." Buttons: "Create an account and test your endpoint first", video. Three steps (Connect your project with an API key and project ID; Configure your collection; Sync & automate). FAQ present. Price not found on the page (not measured). No job or hiring-tool use case.
- **Framer CMS Scheduler** (`/marketplace/plugins/framer-cms-scheduler/`, FramerHub.io; free for 3 pending schedules, $49/year for one project, $99/year unlimited projects). It schedules draft publishing, not sync. Two passages matter for SyncRoles: "Important: a scheduled publish also publishes any other unpublished changes on the site. If you have work in progress, use a separate project or wait until it is ready." and, on the key, "It is encrypted at rest, sent over HTTPS and decrypted only on our server when a publish runs. Disconnecting the project deletes it." It also offers "Failure logs. If a publish fails, you see the status and the log."
- **AnySync** (`/marketplace/plugins/anysync/`, Premonday, paid, one-time price not stated on the listing): any REST API to CMS with "just one click"; no schedule. "Your API data is retrieved securely when you use the plugin—never stored or cached on our servers."
- **FrameRewind** (`/marketplace/plugins/framerewind/`): scheduled CMS backups that "run on our servers, so Framer does not have to be open". Free weekly; Pro $12/month for 3 sites; Agency $39/month for 10 sites. Not a sync tool.
- **CMS Scheduler** (`/marketplace/plugins/cms-scheduler/`, Adam Tretera, free): one vague paragraph, no mechanism.

### Patterns of the strong pages (KnotCMS, Inlet, Framer CMS Scheduler, parts of Lever Jobs)

1. **They name the alternative and say in one sentence what it cannot do.** KnotCMS: "Framer's plugin only syncs when someone opens Framer and clicks sync." This is the SyncRoles hero, and the reader has seen the pattern before.
2. **They explain where the work runs.** "Runs on its own servers", "syncs on a schedule from its server", "runs entirely in your browser". Visitors who build Framer sites want the mechanism, and it is also what ChatGPT quotes.
3. **They state the publishing behaviour and its risk without softening.** KnotCMS: drafts by default, auto-publish optional. Framer CMS Scheduler: a publish "also publishes any other unpublished changes". SyncRoles' "only jobs changed" mode that refuses when other edits are pending is stronger than both and should be described just as concretely.
4. **They say exactly what happens to the API key.** Encrypted at rest, when it is decrypted, how to delete it. Two sentences are enough.
5. **Numbered setup steps and complete prices in the listing itself.** Three or four steps, plans with site counts and limits. The decision is made on the listing.

### Mistakes of the weak pages

1. **"Automatic" for a button.** The free Framer plugins call a one-click sync "Automatic Sync" and promise "at all times". It works for them because they are free; a paid product cannot be vague here.
2. **Adjectives in place of facts** (Greenhouse, Ashby, Recruitee: "seamless", "stunning", "effortless"; CMS Scheduler: "the ultimate companion"). No sync trigger, no limits, no numbers.
3. **Subline repeats the name** (Personio Sync, Workable Sync, CMS Scheduler). The one line that appears in search, in ChatGPT and in the Marketplace grid is wasted.
4. **Claims that contradict each other or cannot be checked** (Lever Jobs: "zero servers" on the listing, "scheduled updates" on the site; "down from $69"; "Top Framer agencies have documented"). Templated FAQ answers (Common Ninja).
5. **No word on closed roles, duplicates or publishing** on most pages, although ChatGPT raises exactly these three in both answers.

## Not measured

- Whether Personio Sync, Ashby and Workable Sync refresh without a click (listing wording is ambiguous; needs a hands-on test).
- Prices of Inlet, AnySync and Framer CMS Sync (not on the pages read).
- Reviews, ratings and install counts of Marketplace plugins (not shown in the fetched pages).
- Structured data on framercms.com and commoninja.com (the parsing tool does not return it).
- The Reddit post "Built a job board for Framer that takes roles down by itself" shown under the r/framer result (could not be opened).
- Whether a SyncRoles Marketplace listing is live: `/marketplace/plugins/syncroles/` returned "Plugin unavailable"; other addresses were not found.
- The CMS category page of the Marketplace could not be loaded (connection errors), so further job plugins may exist beyond the six found.
- DataForSEO cost: not reported by the tools.
