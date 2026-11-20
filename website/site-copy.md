# SyncRoles site copy

Source of the texts on syncroles.com. Change a text here and in `apps/server/public/` together.

## 1. Meta
- Page title: SyncRoles: Framer job board sync for Lever, Greenhouse, Ashby and Personio
- Meta description: Keep your Framer careers page in sync with Lever, Greenhouse, Ashby or Personio. Automatic sync every 15 minutes, closed roles removed, publishing under your control.
- Preview title: SyncRoles: your Framer careers page, in sync with your job board

## 2. Sections
### Opening
- H1: Your Framer careers page, in sync with your job board.
- Text: SyncRoles copies open roles from Lever, Greenhouse, Ashby or Personio into your Framer CMS every 15 minutes. New roles appear, closed roles disappear, and nothing is published unless you chose it.
- Buttons: Get the plugin (Marketplace listing) / See pricing
- Fact line: Framer plugin · manual sync is free · automatic sync from $99 a year

### Built for job boards, so there is nothing to configure.
- Your job-board address is the whole setup
- It runs on our server
- An outage does not empty your page

### How it works
1. Find your jobs  2. Connect the project  3. Build the page once

### You decide what gets published.
Modes: I publish myself (default) / Publish when only jobs changed / Always publish

### Works with four hiring tools
Lever, Greenhouse, Ashby, Personio, each with its job-board address pattern.

### Pricing
Free $0 / Auto-sync $99 per site per year plus tax / Agency $249 per year plus tax, five sites. Paid plans renew yearly until cancelled.

### Questions
**Does it keep syncing when Framer is closed?**
Yes. On a paid plan the sync runs on the SyncRoles server every 15 minutes. Nobody needs to have Framer or the plugin open. On the free plan you start each sync yourself from the plugin.

**What happens when a role is closed?**
It is removed from the Jobs collection at the next sync. If the page is set to publish automatically, the role leaves the live site with that publish. Otherwise it leaves with your next publish.

**Can it publish my unfinished design work?**
Only if you choose “Always publish”. Publishing in Framer always publishes the whole project. The default is that SyncRoles never publishes. With “Publish when only jobs changed”, SyncRoles asks Framer before each sync whether any page has unpublished changes, and if one does, it updates the jobs and leaves publishing to you.

**What if my job board is down or returns no jobs?**
If the job board cannot be reached, nothing in your CMS changes. If it suddenly returns no jobs at all while your collection has some, SyncRoles stops and asks you to confirm in the plugin before it removes anything.

**Which fields do I get in the CMS?**
Title, department, team, location, employment type, remote, compensation (when the job board shows it), description, job page link, apply link and publish date. Field names match Framer's own Ashby plugin. Greenhouse has no standard field for employment type, so that field stays empty unless your company added one.

**Do I design the careers page myself?**
Yes. SyncRoles fills a CMS collection called Jobs. You build the list and the detail page from it in Framer like from any other collection.

**What do I need from my hiring tool?**
Only the address of your public job board, for example jobs.lever.co/your-company. No API key from Lever, Greenhouse, Ashby or Personio is needed. For Personio, the XML feed has to be switched on in its career page settings.

**What do you store?**
Your Framer project address, your Framer Server API key in encrypted form, your job-board address and a log of sync runs. You can delete the key from the plugin at any time, which stops all syncing. Applications never pass through SyncRoles.

**What happens if I cancel?**
Automatic sync stops at the end of the paid year and the site goes back to manual sync. The Jobs collection and everything in it stays in your project.

## 3. Form
The site has no form. Checkout is Stripe's page; the thank-you page shows the licence key with a copy button.

## 4. Fact sentences
- SyncRoles is a Framer plugin with a hosted service that keeps a Framer careers page in sync with a company's hiring tool.
- SyncRoles supports Lever, Greenhouse, Ashby and Personio.
- SyncRoles copies open roles into a Framer CMS collection called Jobs and removes roles that have been closed.
- On paid plans SyncRoles syncs every 15 minutes from its own server, without Framer being open. On the free plan the user starts each sync from the plugin.
- SyncRoles never publishes a Framer site unless the user chose a publishing mode that allows it. The modes are: I publish myself, Publish when only jobs changed, and Always publish.
- If the job board cannot be reached, SyncRoles changes nothing. If the job board suddenly returns no jobs, SyncRoles stops and asks the user to confirm before removing anything.
- Setup needs the company's public job-board address, the Framer project address and a Framer Server API key. No API key from the hiring tool is needed.
- SyncRoles stores the Framer Server API key encrypted and the user can delete it from the plugin at any time.
- SyncRoles costs $99 per site per year or $249 per year for five sites, plus tax, billed yearly. Manual sync is free.
- SyncRoles is operated by Andriy Shevchenko, SmartProcess Lab, Berlin, Germany. Website: https://syncroles.com

## 5. Open questions
- The page says "Works with four hiring tools". Greenhouse, Ashby and Personio still have to be run once through the plugin before launch.
- No comparison with other plugins is made on the page, because their sync behaviour has not been tested hands-on.
- Cancelling: self-service at syncroles.com/manage with the licence key (Stripe customer portal).
