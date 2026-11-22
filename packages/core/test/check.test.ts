import { describe, expect, it } from "vitest"
import { cleanLinkText, compareWithBoard, dominantSource, extractPostingLinks, parsePostingUrl } from "../src/check.js"
import type { Job } from "../src/job.js"

const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"
const C = "33333333-3333-4333-8333-333333333333"
const D = "44444444-4444-4444-8444-444444444444"

function job(id: string, title: string): Job {
    return {
        id, title, department: null, team: null, location: null, employmentType: null, isRemote: null,
        compensation: null, descriptionHtml: "", jobUrl: `https://jobs.ashbyhq.com/acme/${id}`,
        applyUrl: `https://jobs.ashbyhq.com/acme/${id}/application`, publishedAt: null,
    }
}

describe("parsePostingUrl", () => {
    it("recognises single postings on each board", () => {
        expect(parsePostingUrl(`https://jobs.ashbyhq.com/acme/${A}/application`)).toEqual({ kind: "ashby", handle: "acme", id: A })
        expect(parsePostingUrl(`https://jobs.eu.lever.co/acme/${A}`)).toEqual({ kind: "lever", handle: "acme", id: A, options: { region: "eu" } })
        expect(parsePostingUrl("https://job-boards.greenhouse.io/acme/jobs/4674376008")).toEqual({ kind: "greenhouse", handle: "acme", id: "4674376008" })
        expect(parsePostingUrl("https://boards.greenhouse.io/acme?gh_jid=123")).toEqual({ kind: "greenhouse", handle: "acme", id: "123" })
        expect(parsePostingUrl("https://acme.jobs.personio.de/job/42?language=en")).toEqual({ kind: "personio", handle: "acme", id: "42" })
        expect(parsePostingUrl("https://job-boards.eu.greenhouse.io/acme/jobs/77")).toEqual({ kind: "greenhouse", handle: "acme", id: "77", options: { region: "eu" } })
    })
    it("ignores board home pages and other links", () => {
        expect(parsePostingUrl("https://jobs.ashbyhq.com/acme")).toBeNull()
        expect(parsePostingUrl("https://example.com/careers")).toBeNull()
        expect(parsePostingUrl("not a url")).toBeNull()
    })
})

describe("cleanLinkText", () => {
    it("drops CTA words and doubled copies", () => {
        expect(cleanLinkText("Sales Executive London View Role Sales Executive London View Role")).toBe("Sales Executive London")
        expect(cleanLinkText("Product Engineer Apply now")).toBe("Product Engineer")
        expect(cleanLinkText("Apply")).toBe("")
    })
})

describe("extractPostingLinks on cards without link text", () => {
    it("takes the title from the card", () => {
        const html = `<div class="card"><h3>Senior Customer Success Manager</h3><p>New York</p><a href="https://jobs.ashbyhq.com/acme/${A}"></a></div>`
        expect(extractPostingLinks(html, "https://acme.com")[0]?.text).toBe("Senior Customer Success Manager")
        const html2 = `<div class="card"><h3>Senior Customer Success Manager</h3><a href="https://jobs.ashbyhq.com/acme/${A}"><svg></svg></a></div>`
        expect(extractPostingLinks(html2, "https://acme.com")[0]?.text).toBe("Senior Customer Success Manager")
    })
    it("names closed roles from the card layout the open roles show", () => {
        const card = (dept: string, title: string, id: string) =>
            `<div><p>${dept}</p></div><div><p>${title}</p></div><div><p>San Francisco · In office</p></div><a href="https://jobs.ashbyhq.com/acme/${id}"><p>View role</p></a>`
        const html = `<h2>Open roles</h2>${card("Engineering", "Platform Engineer", A)}${card("Sales", "AE", B)}`
        const jobs = [job(A, "Platform Engineer")]
        const r = compareWithBoard(html, "https://acme.com", { kind: "ashby", handle: "acme" }, jobs)
        expect(r.closedButListed.map(c => c.title)).toEqual(["AE"])
    })
})

describe("compareWithBoard", () => {
    const html = `<html><head><meta name="generator" content="Framer 1234"></head><body>
        <a href="https://jobs.ashbyhq.com/acme/${A}">Product Engineer</a>
        <a href="https://jobs.ashbyhq.com/acme/${A}">Apply</a>
        <a href="https://jobs.ashbyhq.com/acme/${B}"><span>Office&nbsp;Manager</span></a>
        <p>Senior Designer, Berlin</p>
        <a href="https://jobs.ashbyhq.com/acme">All jobs</a>
    </body></html>`

    it("finds one link per posting and keeps the descriptive text", () => {
        const links = extractPostingLinks(html, "https://acme.com/careers")
        expect(links.map(l => [l.id, l.text])).toEqual([[A, "Product Engineer"], [B, "Office Manager"]])
        expect(dominantSource(links)).toEqual({ kind: "ashby", handle: "acme" })
    })

    it("reports closed roles still listed and open roles missing", () => {
        const jobs = [job(A, "Product Engineer"), job(C, "Senior Designer"), job(D, "Data Engineer")]
        const r = compareWithBoard(html, "https://acme.com/careers", { kind: "ashby", handle: "acme" }, jobs)
        expect(r.framer).toBe(true)
        expect(r.linked).toBe(2)
        expect(r.open).toBe(3)
        expect(r.closedButListed).toEqual([{ title: "Office Manager", url: `https://jobs.ashbyhq.com/acme/${B}` }])
        // "Senior Designer" is named in the page text, so it is not reported as missing.
        expect(r.openButMissing).toEqual([{ title: "Data Engineer", url: `https://jobs.ashbyhq.com/acme/${D}` }])
        expect(r.linksToBoard).toBe(true)
    })
})
