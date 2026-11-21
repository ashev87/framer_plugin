import { describe, expect, it } from "vitest"
import { assertPublicUrl, CheckError, createCheckRoutes, isPrivateAddress, runCheck } from "../src/check.js"

describe("isPrivateAddress", () => {
    it("blocks internal ranges", () => {
        for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
            expect(isPrivateAddress(ip), ip).toBe(true)
        }
    })
    it("allows public addresses", () => {
        for (const ip of ["31.43.160.6", "8.8.8.8", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false)
    })
})

describe("assertPublicUrl", () => {
    const resolve = async (host: string) => (host === "internal.test" ? ["10.0.0.5"] : ["31.43.160.6"])
    it("rejects other schemes, ports and private hosts", async () => {
        await expect(assertPublicUrl("file:///etc/passwd", resolve)).rejects.toBeInstanceOf(CheckError)
        await expect(assertPublicUrl("https://acme.com:8080/", resolve)).rejects.toBeInstanceOf(CheckError)
        await expect(assertPublicUrl("http://internal.test/", resolve)).rejects.toBeInstanceOf(CheckError)
        await expect(assertPublicUrl("http://127.0.0.1/", resolve)).rejects.toBeInstanceOf(CheckError)
    })
    it("accepts a public https page", async () => {
        expect((await assertPublicUrl("https://acme.com/careers", resolve)).hostname).toBe("acme.com")
    })
})

describe("runCheck", () => {
    const id = "11111111-1111-4111-8111-111111111111"
    it("says so when the page has no job links", async () => {
        const r = await runCheck("https://acme.com", { fetchPage: async url => ({ url, html: "<p>hi</p>" }) })
        expect(r).toEqual({ status: "no-links", url: "https://acme.com", framer: false })
    })
    it("compares the page with the board it links to", async () => {
        const r = await runCheck("https://acme.com/careers", {
            fetchPage: async url => ({ url, html: `<a href="https://jobs.ashbyhq.com/acme/${id}">Old role</a>` }),
            listJobs: async () => [],
        })
        expect(r.status).toBe("checked")
        if (r.status === "checked") expect(r.closedButListed).toHaveLength(1)
    })
})

describe("POST /api/check", () => {
    it("rejects a missing url", async () => {
        const app = createCheckRoutes({ fetchPage: async url => ({ url, html: "" }) })
        const res = await app.request("/api/check", { method: "POST", body: JSON.stringify({}), headers: { "content-type": "application/json" } })
        expect(res.status).toBe(400)
    })
    it("adds https:// when it is missing", async () => {
        let seen = ""
        const app = createCheckRoutes({ fetchPage: async url => ((seen = url), { url, html: "" }) })
        const res = await app.request("/api/check", { method: "POST", body: JSON.stringify({ url: "acme.com/careers" }), headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" } })
        expect(res.status).toBe(200)
        expect(seen).toBe("https://acme.com/careers")
    })
})
