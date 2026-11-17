# SyncRoles launch targets

Checked on 2026-11-17. Nothing has been sent to anyone. Every value below comes from that day's check. A field that could not be checked says "not checked".

## Method

**1. Finding candidates (DataForSEO Backlinks API).** Framer serves custom domains from its own IP range (31.43.160.x). I asked the Backlinks API for every link to a job-board host where the linking domain resolves to `31.43.16x.x` and the link target is a single posting:
- `jobs.ashbyhq.com/<handle>/<uuid>`
- `jobs.lever.co/<handle>/<uuid>`
- `(job-)boards(.eu).greenhouse.io/<token>/jobs/<id>`
- `<x>.jobs.personio.de/job/<id>`

That returned 1,355 links from Framer-hosted domains (Ashby 972, Lever 150, Greenhouse 186, Personio 97). From those I removed job aggregators, VC portfolio boards, blogs, templates and `*.framer.app` / `*.framer.website` staging sites, which left 93 candidate company domains.

**2. Detecting Framer (live page fetch).** I fetched each candidate's careers page with `on_page_instant_pages` and ran a small custom script on it. A site counted as Framer only if the page had both of these:
- `<meta name="generator" content="Framer …">`
- a `Server: Framer/…` header, together with `framerusercontent.com` assets and `data-framer` attributes

Some domains were on the Framer IP but showed no Framer markers (served by Vercel, Webflow or HubSpot). I excluded those.

**3. Reading the careers page.** The same script collected, from the live page:
- every link to the job board, with its link text
- links to the site's own job detail pages
- the visible text
- published `mailto:` addresses and the company LinkedIn page
- any agency credit links

**4. Open roles (job-board APIs, fetched directly).**
- Ashby: `api.ashbyhq.com/posting-api/job-board/<handle>`
- Greenhouse: `boards-api.greenhouse.io/v1/boards/<token>/jobs`
- Lever: `api.lever.co/v0/postings/<handle>`. Lever's API returned 502/504 for about 10 minutes, and the retry worked.
- Personio: the board HTML page (`<x>.jobs.personio.de`), fetched through DataForSEO. The `/xml` feed returned 404 or could not be parsed.

**5. How "stale" was decided.**
- **Closed on board:** the Framer page links to a posting ID that is not in the board's current public list.
- **Open but missing:** an open role on the board whose posting ID is not linked from the page and whose title does not appear in the page text.
- Spot checks confirmed the "closed" result. Five posting URLs fetched live all returned 404 (Playground, Conduct, The Mobile First Company, Artemis, and Kronos via the Greenhouse API). The backlink crawl had already recorded 404s for several others.

**Caveat on "lists roles by hand".** From the outside I cannot tell roles typed in by hand from roles copied by a script or a sync tool. Pages listed as "lists roles in Framer" contain the roles as static Framer content or CMS items, not an embed. Where the CMS slugs equal the ATS posting IDs (Scarlet, Summation, Dataro), the site probably already syncs automatically. Those are marked in Notes.

**Cost.** The DataForSEO tools did not return a cost, so this is an estimate from call counts:
- 11 Backlinks requests returning about 1,500 rows: about $0.27 at about $0.02 per request plus $0.00003 per row.
- About 100 `on_page_instant_pages` calls: about $0.01–0.20, depending on how the custom-JS fetches are priced.
- Estimated total: **about $0.30–0.50**, well under the $3 cap. The job-board API calls were free.

**Excluded after checking:**
- Not Framer (Vercel, Webflow or HubSpot): peec.ai, obvious.ai, usesimple.ai, varickagents.com, axion.com, spacial.io, revel.io.
- Careers page returned 404: usequanta.com, century.health, metal.ai, roam.lol.
- Hiring board gone and no job links left on the page: concord.app (Lever 404), getkalder.com (Ashby 404).
- Domain not resolvable: join.rarible.com.
- Unclear, with no board links in the HTML: omnea.co, twelvelabs.io, unlikely.ai.
- Not fetched: jobs.mollie.com, typesafe.ai, li.fi, and the remaining Personio sites (gcs.ch, abcfinlab.de, muray.tech, y1.de, smarta-steuern.de, ianus-simulation.de).

## Targets

### A. Lists roles in Framer, and the page is stale (strongest leads)

| Company | Website | Careers page URL | Hiring tool + handle | Open roles on job board (count) | Careers page method | Stale? | Public contact route | Notes |
|---|---|---|---|---|---|---|---|---|
| Kronos Research | kronosresearch.com | https://www.kronosresearch.com/careers | Greenhouse `kronosresearch` | 0 | Lists roles in Framer (5 role links) | Yes. The board has 0 open jobs, but the page still lists "Senior SRE Engineer – Taiwan" and "Experienced Quantitative Trader – Remote; Singapore". The Greenhouse API returns "Job not found" for these. | team_ta@kronosresearch.com (mailto on the careers page); https://www.linkedin.com/company/kronosresearch/ | Every listed role is dead. |
| The Mobile First Company | themobilefirstcompany.com | https://www.themobilefirstcompany.com/team (also /es/team) | Ashby `mobilefirst` | 5 | Lists roles in Framer (10 posting links) | Yes. 7 of 10 linked postings are not on the board; posting 3308a306 returns 404. Open but missing: "Sales Development Representative - GTM", "Software Engineer - Agentic Squad". | https://www.linkedin.com/company/the-mobile-first-company/ | Link text is a generic "Join the team", so the closed role titles could not be read. |
| Beauty Barrage | beautybarrage.com | https://www.beautybarrage.com/careers | Lever `beautybarrage` | 220 | Lists a handful of roles in Framer (6 "Job Details" links) | Yes. 5 of 6 linked postings are closed; the crawl on 2026-11-06 got 404, e.g. postings c2f439be… and 1f2bac9d…. The page shows 6 of 220 open roles. | info@beautybarrage.com; https://www.linkedin.com/company/beauty-barrage | High-volume field-sales hiring. |
| Conduct | conduct.ai | https://conduct.ai/careers (redirects to /about) | Ashby `conduct` | 30 | Lists roles in Framer (22 posting links) | Yes. 4 closed: "AI Operations Engineer – London" (404 confirmed) and "Backend Engineer – London". 12 open but missing, e.g. "Regional Director - Enterprise", "Deal Lead". | https://www.linkedin.com/company/conduct-ai/ | |
| Coastal Community Bank | ccbx.com | https://ccbx.com/careers | Ashby `Coastal` | 4 | Lists roles in Framer (3 "Read Full Listing" links) | Yes. All 3 linked postings are off the board; 2 returned 404 in the crawl. Open but missing: "Junior In-House Legal Counsel", "Senior Client Manager - Edmonds". | Contact page not checked; the site publishes commercial@coastalbank.com and customerservice@coastalbank.com (banking service addresses) | Regulated bank, so expect a slower buying process. |
| The Knot Worldwide | theknotww.com | https://www.theknotww.com/careers | Greenhouse `theknotworldwide` | 33 | Lists featured roles in Framer (4 posting links) | Yes. 2 of 4 featured roles are closed (Greenhouse redirects them to `?error=true`): "Sales Executive – London", "Senior Manager, Consolidations and Reporting – New York". | https://www.linkedin.com/company/the-knot-worldwide/ | Large company. |
| Artemis Security | artemissecurity.com | https://artemissecurity.com/careers | Ashby `artemis` | 24 | Lists roles in Framer (24 posting links) | Yes. Closed: "Channel Sales Manager – London" (404 confirmed), "Sales Development Representative – New York City". Missing: "Senior Content Marketing Manager", "Senior Manager, Demand Generation". | https://www.linkedin.com/company/goartemis/ | |
| Playground | tryplayground.com | https://www.tryplayground.com/careers | Ashby `playground` | 6 | Lists roles in Framer | Yes. Closed: "Senior/Staff Backend Engineer – New York" (404 confirmed); the "Talent Network" posting is also not on the board. Missing: "Staff Software Engineer", "Product Quality Analyst". | https://www.linkedin.com/company/tryplayground | |
| Manifest OS | manifestos.com | https://manifestos.com/careers | Ashby `manifest-os` | 9 | Lists roles in Framer (10 links) | Yes. Closed: "Staff Software Engineer – NYC", "Client Operations Manager – NYC". Missing: "Account Executive (Global Mobility & HR)". | contact@manifestos.com; https://www.linkedin.com/company/manifest-o-s/ | |
| Fulcrum | withfulcrum.com | https://www.withfulcrum.com/careers | Ashby `with-fulcrum` | 10 | Lists roles in Framer (11 links) | Yes. 2 "View role" links point to postings not on the board (af09c4b0…, 9ab8e690…). Missing: "People Operations Generalist". | https://www.linkedin.com/company/fulcrumtechincorporated/ | |
| Xona Space Systems | xonaspace.com | https://www.xonaspace.com/careers | Ashby `xona-space` | 56 | Lists roles in Framer (50 posting links) | Yes. Closed: "IT Helpdesk Technician – Burlingame". 7 open roles are not linked by posting ID, e.g. "Flight Director", "Government Counsel". | https://www.linkedin.com/company/xona-space-systems/ | Large list, so a lot of manual upkeep. |
| August | august.law | https://www.august.law/careers | Ashby `august` | 12 | Lists roles in Framer (9 roles) | Yes. Open but missing: "GTM Engineer", "Community & Partnerships Lead", "Special Projects Lead (India-Based)". | team@august.law; https://www.linkedin.com/company/augustlegal | |
| Sierra Studio | sierra.studio | https://sierra.studio/join-the-team | Ashby `sierra-studio` | 11 | Lists 3 roles in Framer plus an "All Open Positions" link | Yes. 8 open roles not shown, e.g. "Full Stack Engineer (Ruby On Rails)", "Entrepreneur in Residence (EIR)". | https://www.linkedin.com/company/sierra-studio-ss/ | Venture studio that hires for portfolio companies; could be multi-site. |
| Ornn | ornn.com | https://ornn.com/careers | Ashby `ornn` | 14 | Lists roles in Framer (8) | Yes. 6 open but missing, e.g. "Head of Talent", "Sell Side Research Analyst". | https://www.linkedin.com/company/ornn/ | Footer credits Haptic Studio (see agencies). |
| Possible Finance | possiblefinance.com | https://www.possiblefinance.com/careers | Ashby `possible-finance` | 5 | Lists roles in Framer (7) | Yes. Closed: "Customer Support Agent, Tier 1 – Costa Rica", "Recruiting Coordinator – Seattle". | https://www.linkedin.com/company/possible-finance | A test page, /sam-test-jobs, also links postings. |
| Lapel | lapel.com | https://lapel.com/careers | Ashby `Lapel` | 8 | Lists roles in Framer (10) | Yes. "Talent Lead – San Francisco" and "Create my own role" are not on the public board. | not checked | |
| Hanover Park | hanoverpark.com | https://www.hanoverpark.com/careers | Ashby `hanover-park` | 9 | Lists roles in Framer (7) | Yes. Missing: "Product Designer", "Founding Design Engineer". | https://www.linkedin.com/company/hanoverpark/ | An older /careers-old page still exists. |
| Noxtua | noxtua.com | https://www.noxtua.com/company/jobs | Personio `noxtua` | 13 | Lists roles in Framer (10) | Yes. Missing: "Legal Engineer – Partner Enablement", "Legal Sales Engineer", "VP Marketing". | hello@noxtua.com; https://www.linkedin.com/company/noxtua | Personio, Berlin. |
| Moltomedia | moltomedia.de | https://moltomedia.de/karriere | Personio `moltomedia` | 4 | Lists roles in Framer (2 linked) | Yes. 2 open roles are not linked or named on the page: "Werkstudierende Webdesign / Digital Design (m/w/d)", "Projektmanager:in Digital (m/w/d)". | info@moltomedia.de; https://www.linkedin.com/company/moltomedia/ | Moltomedia is a digital agency itself, so it is also a 5-site-plan prospect. |
| Amaranth Advisory | amaranth-advisory.com | https://www.amaranth-advisory.com/careers | Personio `amaranth-advisory-1` | 4 | Lists roles in Framer (3) | Yes. Missing: "(Senior) Consultant IT-Security, Regulatorik & Technologie – Financial Services". | https://www.linkedin.com/company/amaranth-advisory/ | |
| Minnesota Cannabis Services | mncanna.com | https://www.mncanna.com/careers | Greenhouse `mcs` | 40 | Lists roles in Framer (40) | Yes. Closed: "Marketing Manager – Edina, MN". Missing: "Construction Project Manager". | not checked | Retail hiring with a lot of turnover. |
| Duna | duna.com | https://duna.com/careers | Ashby `duna` | 12 | Lists roles in Framer (12) | Yes. Closed: "Content Lead – Remote". | https://www.linkedin.com/company/building-duna/ | |
| BranchLab | branchlab.com | https://branchlab.com/careers | Ashby `BranchLab` | 11 | Lists roles in Framer (12) | Yes. 1 "Learn more" link goes to a posting not on the board (5049933e…). | https://www.linkedin.com/company/branch-lab | |
| Abacum | abacum.ai | https://www.abacum.ai/company/careers | Ashby `abacum` | 11 | Lists roles in Framer (12) | Yes. Closed: "People Operations Generalist". | https://www.linkedin.com/company/abacum-io/ | |
| Ando | ando.work | https://www.ando.work/careers | Ashby `andotechnologies` | 2 | Lists roles in Framer (3) | Yes. Closed: "Account Executive - Restaurants – Remote" (404 in the crawl). | not checked | |
| Nopan | nopan.com | https://www.nopan.com/careers | Ashby `nopan` | 1 | Lists roles in Framer (2) | Yes. Closed: "Senior Software Engineer – Remote / Amsterdam" (404 in the crawl). | not checked | |
| Outlive | outlive.com | https://www.outlive.com/careers | Greenhouse `outlive` | 2 | Lists roles in Framer (3 links) | Yes. 1 "Apply Now" link goes to a posting not on the board (4109158009). | not checked | |
| Summation | summation.com | https://www.summation.com/careers | Ashby `summation` | 7 | Lists roles in Framer CMS (8) | Yes. 1 "Apply now" link goes to a posting not on the board (9a691676…); the page also has "Staff Product Engineer", which is not on the board. | https://linkedin.com/company/summation-hq/ | CMS slugs equal Ashby IDs, so it may already sync automatically. |
| Zania | zania.ai | https://zania.ai/careers | Ashby `zania` | 15 | Lists roles in Framer CMS (/careers/<slug> pages) | Yes. Missing: "Social Media & Growth Marketer". | https://www.linkedin.com/company/zaniaai | |
| Voodoo | voodoo.io | https://voodoo.io/join-our-creative-team | Ashby `voodoo` (moved from Lever `voodoo`, which now returns 404) | 102 | This page links one posting; the main careers flow was not checked | Yes. "Submit your creative" links a posting not on the board. Older news pages still link old Lever postings (the crawl recorded 404s). | press@voodoo.io; https://www.linkedin.com/company/voodoo.io | Large company, low certainty about its main careers page. |
| Paragon | useparagon.com | https://www.useparagon.com/careers | Ashby `Paragon` | 0 | Says "Nothing at the moment! Check back soon." and links to the board | Slightly. That text links to a posting that is closed (404 in the crawl). | support@useparagon.com | Weak: not hiring now. |
| Cradle | cradle.bio | https://www.cradle.bio/careers | Ashby `cradlebio` | 4 | Embeds the board (Ashby embed script) | Slightly. The hard-coded "open application" link goes to a posting not on the public board. | not checked | Embed users are weaker leads. |

### B. Lists roles in Framer, and the page matches the board today

| Company | Website | Careers page URL | Hiring tool + handle | Open roles on job board (count) | Careers page method | Stale? | Public contact route | Notes |
|---|---|---|---|---|---|---|---|---|
| Augment | goaugment.com | https://www.goaugment.com/careers | Ashby `go-augment` | not checked (the public posting API returns 404, although jobs.ashbyhq.com/go-augment loads) | Lists roles in Framer (12 posting links) | not checked | careers@goaugment.com | 12 roles kept by hand, so a strong fit. |
| Tilde Research | tilderesearch.com | https://tilderesearch.com/join | Ashby `tilderesearch` | not checked (posting API 404) | Lists roles in Framer (3) | not checked | join@tilderesearch.com | |
| Chai Discovery | chaidiscovery.com | https://www.chaidiscovery.com/careers | Ashby `chaidiscovery` | 23 | Lists roles in Framer (23) | No | info@chaidiscovery.com | A large list to keep up to date. |
| Ambience Healthcare | ambiencehealthcare.com | https://www.ambiencehealthcare.com/careers | Ashby `ambiencehealthcare` | 18 | Lists roles in Framer (18) | No | not checked | |
| Ricursive Intelligence | ricursive.com | https://www.ricursive.com/careers | Ashby `Ricursive Intelligence` | 16 | Lists roles in Framer (16) | No | not checked | |
| Opal Security | opal.dev | https://www.opal.dev/careers | Ashby `opal` | 11 | Lists roles in Framer (11) | No | people@opal.dev | |
| Method | methodfi.com | https://methodfi.com/company/careers | Ashby `method` | 11 | Lists roles in Framer (11) | No | https://www.linkedin.com/company/methodfi | |
| CUBE | cube.global | https://www.cube.global/company/careers | Ashby `CUBE` | 11 | Lists roles in Framer (11) | No | https://www.linkedin.com/company/cube-global | |
| Numa | numa.com | https://numa.com/careers | Greenhouse `numa` | 9 | Lists roles in Framer (9) | No | https://www.linkedin.com/company/numa/ | |
| Summ.link | summ.link | https://summ.link/careers | Greenhouse `summlinkbv` (EU) | 8 | Lists roles in Framer (8) | No | https://www.linkedin.com/company/summlinkbv | |
| Ankar | ankar.ai | https://ankar.ai/careers | Ashby `ankar` | 8 | Lists roles in Framer (8) | No | careers@ankar.ai | |
| Ajax | joinajax.com | https://joinajax.com/careers | Ashby `Ajax` | 6 | Lists roles in Framer (6) | No | careers@joinajax.com | |
| Qontext | qontext.ai | https://qontext.ai/careers | Ashby `qontext` | 6 | Lists roles in Framer CMS (/open-positions/<slug>) | No | https://www.linkedin.com/company/qontext-ai/ | |
| Vertical Semiconductor | verticalsemi.com | https://www.verticalsemi.com/careers | Ashby `verticalsemi` | 5 | Lists roles in Framer (5) | No | careers@verticalsemi.com | |
| Absentia Labs | absentia.bio | https://www.absentia.bio/ | Ashby `absentia-labs` | 4 | Lists roles in Framer on the homepage (4) | No | not checked | |
| Conception | conception.bio | https://www.conception.bio/ | Ashby `Conception` | 4 | Lists roles in Framer on the homepage (4) | No | hello@conception.bio | |
| Source | source.paris | https://source.paris/carrieres | Lever `source` | 3 | Lists roles in Framer (3) | No | https://www.linkedin.com/company/source-interactive | Paris agency, so also a 5-site-plan prospect. |
| Arena Magazine | arenamag.com | https://arenamag.com/careers | Ashby `arena-magazine` | 3 | Lists roles in Framer (3) | No | help@arenamag.com | |
| Freckle | freckle.io | https://www.freckle.io/careers | Ashby `freckle` | 2 | Lists roles in Framer (2) | No | https://www.linkedin.com/company/freckleio/ | |
| Scarlet | scarlet.cc | https://www.scarlet.cc/careers | Ashby `scarlet` | 19 | Lists roles in Framer CMS (/careers/<ashby-id>) | No | hello@scarlet.cc | CMS slugs equal Ashby IDs, so it probably already syncs. |
| Dataro | dataro.io | https://dataro.io/careers | Ashby `dataro` | 1 | Lists roles in Framer CMS (/careers/<ashby-id>) | No | https://www.linkedin.com/company/dataro/ | Probably already syncs. |
| Irregular | irregular.com | https://www.irregular.com/careers | Ashby `Irregular` | 11 | Embeds the board (Ashby embed) | No | not checked | Embed, so a weak fit. |

### C. Only links out to the job board (weakest leads)

| Company | Website | Careers page URL | Hiring tool + handle | Open roles on job board (count) | Careers page method | Stale? | Public contact route | Notes |
|---|---|---|---|---|---|---|---|---|
| Lawhive | labs.lawhive.co.uk | https://labs.lawhive.co.uk/ | Ashby `lawhive` | 9 | Mostly links out ("Join our team"); 1 role linked directly | Not applicable for the links. 8 open roles are not shown, e.g. "Senior Data Engineer", "FP&A Lead". | not checked | |
| SpruceID | spruceid.com | https://spruceid.com/ (footer "Careers") | Ashby `spruceid` | 7 | Only links out | Not applicable | https://www.linkedin.com/company/sprucesystemsinc/ | |
| Magical | getmagical.com | https://www.getmagical.com/ (footer "Careers") | Ashby `magical` | 1 | Only links out | Not applicable | https://www.linkedin.com/company/getmagical | |

## Framer agencies and studios seen

Few of the checked pages credit an agency in links that the check could detect. The credit-link scan found only these:

- **Haptic Studio**, https://www.haptic.studio/. Credited in the footer of ornn.com.
- **Moltomedia** (moltomedia.de, Saarbrücken). A digital agency whose own site is on Framer with a Personio careers page (it is in table A). It may build Framer sites for clients, but that was not checked.
- **Source** (source.paris). A Paris agency whose own site is on Framer with a Lever careers page (in table B). Whether it builds Framer sites for clients was not checked.

The search also turned up Framer-built job boards that list other companies' roles: memorisely.com, designx.community, radiancefields.com, lorikeetcx.ai, synbiobeta.com, designerfund.com, remote100k.com and thedesigncareers.framer.website. These are not SyncRoles buyers (they aggregate many boards), so I left them out of the tables.
