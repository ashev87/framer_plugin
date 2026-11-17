# SyncRoles: product context

Written 16 Nov 2026, positioning revised by the owner on 17 Nov 2026.

## What it is
A Framer plugin with a hosted service behind it. It copies open roles from a company's hiring tool (Lever, Greenhouse, Ashby, Personio) into a Jobs collection in the Framer CMS: once per click on the free tier, every 15 minutes on the paid tier. Closed roles are removed. The customer chooses whether SyncRoles also publishes the site.

## Positioning (revised 17 Nov 2026 after research)
SyncRoles keeps your Framer careers page in sync with Lever, Greenhouse, Ashby or Personio. Enter your company's job-board address and it runs every 15 minutes: new roles appear, closed roles disappear, and nothing is published unless you chose it.

It is the sync built for job boards. Against the general-purpose scheduled sync tools (Inlet, KnotCMS): no API to configure, no field mapping, and a job-board outage does not empty the careers page. Against the click-to-sync job plugins (free Greenhouse, Ashby, Recruitee and Personio plugins; Lever Jobs at $29): it runs by itself.

## Who the site is for (confirmed 17 Nov 2026)
One primary visitor: the person who maintains the Framer site. That is a designer, an agency, or whoever looks after a startup's site. People and recruiting leads benefit from the product but do not browse the Framer Marketplace or install plugins, so the site is not written for them.

## Where visitors come from and what they know
- From the plugin's listing in the Framer Marketplace and from posts in the Framer Community. Many will decide on the listing and never reach the site, so the listing carries the same first line as the site.
- They know Framer and the CMS well and have never heard of SyncRoles.
- An in-house maintainer knows the company's hiring tool; an agency often does not. Setup must need nothing from the hiring tool except the company's job-board address.

## The alternatives they compare against
- Click-to-sync job plugins: Greenhouse, Ashby, Recruitee (by Framer, free), Personio Sync, Workable Sync, Gem Sync (by Trueform, free), Lever Jobs ($29 one-time, published 1 Nov 2026, "100% User-Initiated"). Their listings describe a single click; none mentions a schedule. Whether they are manual only must be tested hands-on before the site says so.
- General scheduled sync: Inlet (any JSON API, server-side schedule on paid plans, optional publish; published 3 Nov 2026) and KnotCMS (Notion and Google Sheets, every minute, $85/year for one site).

## Trust concerns, in this order
1. "Will this publish my client's unfinished work?" Lead with how publishing is handled.
2. "What happens to my API key?" Encrypted, deletable from the plugin at any time.

## What the site has to achieve
Main goal: a visitor buys the yearly Auto-sync or Agency licence. Second goal: a visitor who is not ready installs the free plugin.

## Proof that really exists
- It works with Lever, Greenhouse, Ashby and Personio; the feeds it reads are the public ones. Claim four tools only if all four work at launch (all four adapters returned real jobs from live boards on 16 Nov; only Lever has been run end to end through the plugin so far).
- How publishing is handled: nothing is published unless chosen, and the "only jobs changed" mode refuses when a page has other unpublished edits (verified on a test project for page edits).
- What is stored and how: API key encrypted, deletable from the plugin at any time.
- No customers, reviews, logos or numbers yet. None may be invented.

## What must not appear
- Invented testimonials, customer logos, usage numbers or response-time promises.
- Claims about failure alerts by email (not built).

## Voice
English. Addressed as "you". Plain and specific, written for people who build websites for a living.

## Fixed elements
- Prices: Free; $99 per site per year; $249 per year for five sites; tax on top; yearly renewal.
- Legal: Impressum and privacy contact of Andriy Shevchenko, SmartProcess Lab, Berlin.
- The hackathon traffic tracker stays in the head of every page.
