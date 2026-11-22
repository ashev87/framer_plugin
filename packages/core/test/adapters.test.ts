import { describe, expect, it } from "vitest"
import { listJobs } from "../src/adapters/index.js"
import { SourceError } from "../src/job.js"

// Fixtures follow the documented response shapes; they are not captured live responses.
function fake(body: string, status = 200, seen?: string[]): typeof fetch {
    return (async (url: any) => {
        seen?.push(String(url))
        return new Response(body, { status })
    }) as typeof fetch
}

describe("lever", () => {
    const body = JSON.stringify([
        {
            id: "uuid-1",
            text: "Backend Engineer",
            categories: { team: "Platform", department: "Engineering", location: "Berlin", commitment: "Full-time" },
            description: "<div>Intro</div>",
            lists: [{ text: "You & us", content: "<li>One</li>" }],
            additional: "<div>Outro</div>",
            applyUrl: "https://jobs.lever.co/acme/uuid-1/apply",
            hostedUrl: "https://jobs.lever.co/acme/uuid-1",
            workplaceType: "remote",
            salaryRange: { min: 90000, max: 110000, currency: "EUR", interval: "per-year-salary" },
            createdAt: 1762000000000,
        },
        { id: "broken" },
    ])
    it("maps postings and joins the description parts", async () => {
        const seen: string[] = []
        const jobs = await listJobs({ kind: "lever", handle: "acme" }, fake(body, 200, seen))
        expect(seen).toEqual(["https://api.lever.co/v0/postings/acme?mode=json"])
        expect(jobs).toHaveLength(1)
        expect(jobs[0]).toMatchObject({
            id: "uuid-1",
            title: "Backend Engineer",
            department: "Engineering",
            team: "Platform",
            location: "Berlin",
            employmentType: "Full-time",
            isRemote: true,
            compensation: "EUR 90,000 – EUR 110,000 per year",
            descriptionHtml: "<div>Intro</div><h3>You &amp; us</h3><ul><li>One</li></ul><div>Outro</div>",
            jobUrl: "https://jobs.lever.co/acme/uuid-1",
            applyUrl: "https://jobs.lever.co/acme/uuid-1/apply",
        })
        expect(jobs[0]!.publishedAt).toBe(new Date(1762000000000).toISOString())
    })
    it("uses the EU host when asked", async () => {
        const seen: string[] = []
        await listJobs({ kind: "lever", handle: "acme", options: { region: "eu" } }, fake("[]", 200, seen))
        expect(seen[0]).toContain("api.eu.lever.co")
    })
    it("fails on an unknown handle instead of returning no jobs", async () => {
        await expect(listJobs({ kind: "lever", handle: "nope" }, fake("{}", 404))).rejects.toBeInstanceOf(SourceError)
    })
    it("fails on a non-array body and on unsafe handles", async () => {
        await expect(listJobs({ kind: "lever", handle: "acme" }, fake('{"ok":false}'))).rejects.toBeInstanceOf(SourceError)
        await expect(listJobs({ kind: "lever", handle: "a/../b" }, fake("[]"))).rejects.toBeInstanceOf(SourceError)
    })
})

describe("retries", () => {
    it("retries a server error and a dropped connection, then succeeds", async () => {
        let n = 0
        const flaky = (async () => {
            n++
            if (n === 1) return new Response("", { status: 503 })
            if (n === 2) throw new TypeError("fetch failed")
            return new Response("[]")
        }) as typeof fetch
        expect(await listJobs({ kind: "lever", handle: "acme" }, flaky)).toEqual([])
        expect(n).toBe(3)
    })
    it("gives up after three attempts and does not retry a 404", async () => {
        let n = 0
        const down = (async () => (n++, new Response("", { status: 502 }))) as typeof fetch
        await expect(listJobs({ kind: "lever", handle: "acme" }, down)).rejects.toThrow(/HTTP 502/)
        expect(n).toBe(3)
        n = 0
        const missing = (async () => (n++, new Response("", { status: 404 }))) as typeof fetch
        await expect(listJobs({ kind: "lever", handle: "acme" }, missing)).rejects.toBeInstanceOf(SourceError)
        expect(n).toBe(1)
    })
})

describe("greenhouse", () => {
    const item = {
        id: 127817,
        title: "Vault Designer",
        updated_at: "2016-01-14T10:55:28-05:00",
        first_published: "2016-01-10T10:00:00-05:00",
        location: { name: "NYC" },
        absolute_url: "https://boards.greenhouse.io/vaulttec/jobs/127817",
        metadata: [{ name: "Employment Type", value: "Full-time" }],
        content: "&lt;p&gt;Design &amp;amp; build&lt;/p&gt;",
        departments: [{ id: 1, name: "Design" }],
    }
    it("maps jobs and unescapes the content once", async () => {
        const jobs = await listJobs(
            { kind: "greenhouse", handle: "vaulttec" },
            fake(JSON.stringify({ jobs: [item], meta: { total: 1 } }))
        )
        expect(jobs[0]).toMatchObject({
            id: "127817",
            department: "Design",
            team: null,
            location: "NYC",
            employmentType: "Full-time",
            isRemote: null,
            descriptionHtml: "<p>Design &amp; build</p>",
            jobUrl: "https://boards.greenhouse.io/vaulttec/jobs/127817",
            applyUrl: "https://boards.greenhouse.io/vaulttec/jobs/127817",
            publishedAt: "2016-01-10T15:00:00.000Z",
        })
    })
    it("fails when the list is shorter than the reported total", async () => {
        await expect(
            listJobs({ kind: "greenhouse", handle: "vaulttec" }, fake(JSON.stringify({ jobs: [item], meta: { total: 2 } })))
        ).rejects.toBeInstanceOf(SourceError)
    })
    it("falls back to the EU API when the US API has no such board", async () => {
        const seen: string[] = []
        const f = (async (url: any) => {
            seen.push(String(url))
            return String(url).includes(".eu.")
                ? new Response(JSON.stringify({ jobs: [item], meta: { total: 1 } }), { status: 200 })
                : new Response("not found", { status: 404 })
        }) as typeof fetch
        const jobs = await listJobs({ kind: "greenhouse", handle: "vaulttec" }, f)
        expect(jobs).toHaveLength(1)
        expect(seen.map(u => new URL(u).hostname)).toEqual(["boards-api.greenhouse.io", "boards-api.eu.greenhouse.io"])
    })
    it("asks the EU API first for EU boards", async () => {
        const seen: string[] = []
        await listJobs({ kind: "greenhouse", handle: "vaulttec", options: { region: "eu" } }, fake(JSON.stringify({ jobs: [item], meta: { total: 1 } }), 200, seen))
        expect(new URL(seen[0]!).hostname).toBe("boards-api.eu.greenhouse.io")
    })
    it("falls back to the US API when the EU API cannot be reached", async () => {
        const seen: string[] = []
        const f = (async (url: any) => {
            seen.push(String(url))
            if (String(url).includes(".eu.")) throw new TypeError("fetch failed")
            return new Response(JSON.stringify({ jobs: [item], meta: { total: 1 } }), { status: 200 })
        }) as typeof fetch
        const jobs = await listJobs({ kind: "greenhouse", handle: "summ", options: { region: "eu" } }, f)
        expect(jobs).toHaveLength(1)
        expect(new URL(seen.at(-1)!).hostname).toBe("boards-api.greenhouse.io")
    })
})

describe("ashby", () => {
    it("maps jobs and skips unlisted postings", async () => {
        const body = JSON.stringify({
            jobs: [
                {
                    id: "a1",
                    title: "Designer",
                    department: "Engineering",
                    team: "Comms",
                    location: "Remote",
                    employmentType: "FullTime",
                    isRemote: true,
                    descriptionHtml: "<p>Hi</p>",
                    jobUrl: "https://jobs.ashbyhq.com/acme/a1",
                    applyUrl: "https://jobs.ashbyhq.com/acme/a1/application",
                    publishedAt: "2026-10-01T09:00:00.000+00:00",
                    isListed: true,
                    shouldDisplayCompensationOnJobPostings: true,
                    compensation: { compensationTierSummary: "$120K – $150K", scrapeableCompensationSalarySummary: null },
                },
                {
                    id: "a3",
                    title: "Recruiter",
                    team: "People",
                    jobUrl: "https://jobs.ashbyhq.com/acme/a3",
                    applyUrl: "https://jobs.ashbyhq.com/acme/a3/application",
                    shouldDisplayCompensationOnJobPostings: false,
                    compensation: { compensationTierSummary: "$90K" },
                },
                { id: "a2", title: "Secret", applyUrl: "https://x", isListed: false },
            ],
        })
        const seen: string[] = []
        const jobs = await listJobs({ kind: "ashby", handle: "acme" }, fake(body, 200, seen))
        expect(seen).toEqual(["https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=true"])
        expect(jobs.map(j => j.id)).toEqual(["a1", "a3"])
        expect(jobs[0]).toMatchObject({
            id: "a1",
            department: "Engineering",
            team: "Comms",
            employmentType: "Full-time",
            isRemote: true,
            compensation: "$120K – $150K",
            jobUrl: "https://jobs.ashbyhq.com/acme/a1",
            applyUrl: "https://jobs.ashbyhq.com/acme/a1/application",
            publishedAt: "2026-10-01T09:00:00.000Z",
        })
        // No department: the team stands in for it; pay hidden unless the company shows it.
        expect(jobs[1]).toMatchObject({ department: "People", team: null, isRemote: null, compensation: null })
    })
})

describe("personio", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<workzag-jobs><position>
  <id>1834171</id>
  <office>Munich</office>
  <department>Product and Tech</department>
  <name>Staff Engineer, R&amp;D</name>
  <jobDescriptions>
    <jobDescription><name>How you&#039;ll make an impact</name><value><![CDATA[<strong>Hybrid</strong>]]></value></jobDescription>
    <jobDescription><name>What you do</name><value><![CDATA[<ul><li>Build</li></ul>]]></value></jobDescription>
  </jobDescriptions>
  <employmentType>permanent</employmentType>
  <schedule>full-time</schedule>
  <createdAt>2024-11-13T14:10:41+00:00</createdAt>
</position></workzag-jobs>`
    it("maps positions, sections and builds the apply url", async () => {
        const seen: string[] = []
        const jobs = await listJobs({ kind: "personio", handle: "acme", options: { language: "en" } }, fake(xml, 200, seen))
        expect(seen).toEqual(["https://acme.jobs.personio.de/xml?language=en"])
        expect(jobs[0]).toEqual({
            id: "1834171",
            title: "Staff Engineer, R&D",
            department: "Product and Tech",
            team: null,
            location: "Munich",
            employmentType: "Full-time",
            isRemote: null,
            compensation: null,
            descriptionHtml:
                "<h3>How you'll make an impact</h3><strong>Hybrid</strong><h3>What you do</h3><ul><li>Build</li></ul>",
            jobUrl: "https://acme.jobs.personio.de/job/1834171?language=en",
            applyUrl: "https://acme.jobs.personio.de/job/1834171?language=en",
            publishedAt: "2024-11-13T14:10:41.000Z",
        })
    })
    it("reads an empty board as zero jobs", async () => {
        expect(await listJobs({ kind: "personio", handle: "acme" }, fake("<workzag-jobs/>"))).toEqual([])
    })
    it("fails on an HTML page or a truncated feed", async () => {
        await expect(listJobs({ kind: "personio", handle: "acme" }, fake("<html>Not found</html>"))).rejects.toBeInstanceOf(SourceError)
        await expect(listJobs({ kind: "personio", handle: "acme" }, fake(xml.slice(0, 200)))).rejects.toBeInstanceOf(SourceError)
    })
})
