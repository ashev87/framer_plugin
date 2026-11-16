import { createHmac } from "node:crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { migrate, openDb, type Db } from "../src/db.js"
import { createBilling, fulfil, verifyWebhook } from "../src/stripe.js"

const SECRET = "whsec_test"
const sign = (payload: string, t = Math.floor(Date.now() / 1000)) =>
    `t=${t},v1=${createHmac("sha256", SECRET).update(`${t}.${payload}`).digest("hex")}`

describe("verifyWebhook", () => {
    it("accepts a correctly signed, recent payload only", () => {
        const body = '{"a":1}'
        expect(verifyWebhook(body, sign(body), SECRET)).toBe(true)
        expect(verifyWebhook(body + " ", sign(body), SECRET)).toBe(false)
        expect(verifyWebhook(body, sign(body), "other")).toBe(false)
        expect(verifyWebhook(body, sign(body, Math.floor(Date.now() / 1000) - 3600), SECRET)).toBe(false)
        expect(verifyWebhook(body, undefined, SECRET)).toBe(false)
    })
})

const url = process.env.TEST_DATABASE_URL
const d = url ? describe : describe.skip

d("billing", () => {
    let db: Db
    const paid = (id: string, plan = "site") => ({
        id, payment_status: "paid", payment_intent: `pi_${id}`, customer: null,
        customer_details: { email: "buyer@example.com" }, metadata: { plan },
    })
    let requests: { url: string; body: string }[]
    let app: ReturnType<typeof createBilling>

    beforeAll(async () => {
        db = openDb(url!)
        await migrate(db)
    })
    afterAll(() => db?.end())
    beforeEach(async () => {
        await db.query("truncate sites, licences, runs cascade")
        requests = []
        app = createBilling(db, {
            secretKey: "sk_test_x", webhookSecret: SECRET, siteUrl: "https://syncroles.com",
            fetchImpl: (async (u: any, init: any) => {
                requests.push({ url: String(u), body: String(init?.body ?? "") })
                if (String(u).endsWith("/checkout/sessions")) return Response.json({ url: "https://checkout.stripe.com/c/pay/x" })
                if (String(u).includes("cs_test_paid1234567")) return Response.json(paid("cs_test_paid1234567", "agency"))
                return Response.json({ id: "cs_test_unpaid123456", payment_status: "unpaid", metadata: { plan: "site" } })
            }) as typeof fetch,
        })
    })

    it("sends the buyer to Stripe with the right price and plan", async () => {
        const res = await app.request("/buy?plan=agency")
        expect(res.status).toBe(303)
        expect(res.headers.get("location")).toBe("https://checkout.stripe.com/c/pay/x")
        const sent = new URLSearchParams(requests[0]!.body)
        expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("24900")
        expect(sent.get("metadata[plan]")).toBe("agency")
        expect((await app.request("/buy?plan=free")).status).toBe(400)
    })

    it("creates exactly one licence per paid session, however often it is fulfilled", async () => {
        const first = await fulfil(db, paid("cs_1"))
        const second = await fulfil(db, paid("cs_1"))
        expect(first).toMatch(/^SR-[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/)
        expect(second).toBe(first)
        expect(await fulfil(db, { ...paid("cs_2"), payment_status: "unpaid" })).toBeNull()
        const { rows } = await db.query("select plan, max_sites, expires_at > now() + interval '364 days' as year from licences")
        expect(rows).toEqual([{ plan: "site", max_sites: 1, year: true }])
    })

    it("fulfils from a signed webhook, rejects an unsigned one, and revokes on a full refund", async () => {
        const event = JSON.stringify({ type: "checkout.session.completed", data: { object: paid("cs_3") } })
        expect((await app.request("/stripe/webhook", { method: "POST", body: event })).status).toBe(400)
        expect((await db.query("select 1 from licences")).rowCount).toBe(0)
        expect((await app.request("/stripe/webhook", { method: "POST", body: event, headers: { "stripe-signature": sign(event) } })).status).toBe(200)
        expect((await db.query("select status from licences")).rows).toEqual([{ status: "active" }])

        const refund = JSON.stringify({ type: "charge.refunded", data: { object: { refunded: true, payment_intent: "pi_cs_3" } } })
        await app.request("/stripe/webhook", { method: "POST", body: refund, headers: { "stripe-signature": sign(refund) } })
        expect((await db.query("select status from licences")).rows).toEqual([{ status: "refunded" }])
    })

    it("shows the licence on the thank-you page only for a paid session", async () => {
        const ok = await app.request("/api/licence?session_id=cs_test_paid1234567")
        expect(await ok.json()).toMatchObject({ plan: "agency", key: expect.stringMatching(/^SR-/) })
        expect((await app.request("/api/licence?session_id=cs_test_unpaid123456")).status).toBe(404)
        expect((await app.request("/api/licence?session_id=../../x")).status).toBe(400)
    })
})
