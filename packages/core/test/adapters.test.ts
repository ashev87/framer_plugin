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
            location: "Berlin",
            employmentType: "Full-time",
            descriptionHtml: "<div>Intro</div><h3>You &amp; us</h3><ul><li>One</li></ul><div>Outro</div>",
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
            location: "NYC",
            employmentType: "Full-time",
            descriptionHtml: "<p>Design &amp; build</p>",
            publishedAt: "2016-01-10T15:00:00.000Z",
        })
    })
    it("fails when the list is shorter than the reported total", async () => {
        await expect(
            listJobs({ kind: "greenhouse", handle: "vaulttec" }, fake(JSON.stringify({ jobs: [item], meta: { total: 2 } })))
        ).rejects.toBeInstanceOf(SourceError)
    })
})

describe("ashby", () => {
    it("maps jobs and skips unlisted postings", async () => {
        const body = JSON.stringify({
            jobs: [
                {
                    id: "a1",
                    title: "Designer",
                    department: "Design",
                    location: "Remote",
                    employmentType: "FullTime",
                    descriptionHtml: "<p>Hi</p>",
                    applyUrl: "https://jobs.ashbyhq.com/acme/a1/application",
                    publishedAt: "2026-10-01T09:00:00.000+00:00",
                    isListed: true,
                },
                { id: "a2", title: "Secret", applyUrl: "https://x", isListed: false },
            ],
        })
        const jobs = await listJobs({ kind: "ashby", handle: "acme" }, fake(body))
        expect(jobs).toHaveLength(1)
        expect(jobs[0]).toMatchObject({ id: "a1", employmentType: "Full-time", publishedAt: "2026-10-01T09:00:00.000Z" })
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
            location: "Munich",
            employmentType: "Full-time",
            descriptionHtml:
                "<h3>How you'll make an impact</h3><strong>Hybrid</strong><h3>What you do</h3><ul><li>Build</li></ul>",
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
