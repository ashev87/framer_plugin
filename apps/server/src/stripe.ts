import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { Hono } from "hono"
import type { Db } from "./db.js"

export const PLANS = {
    site: { lookupKey: "syncroles_site_yearly", maxSites: 1 },
    agency: { lookupKey: "syncroles_agency_yearly", maxSites: 5 },
} as const
export type Plan = keyof typeof PLANS

/** Days a licence keeps working after its paid period ends, to ride out a late or retried renewal charge. */
const GRACE_DAYS = 3

export interface StripeConfig {
    secretKey: string
    webhookSecret: string
    siteUrl: string
    fetchImpl?: typeof fetch
}

/** Stripe's REST API with form encoding; small enough not to need the SDK. */
async function stripe(config: StripeConfig, method: "GET" | "POST", path: string, params?: Record<string, string>): Promise<any> {
    const res = await (config.fetchImpl ?? fetch)(`https://api.stripe.com/v1${path}`, {
        method,
        headers: { authorization: `Bearer ${config.secretKey}`, "content-type": "application/x-www-form-urlencoded" },
        body: params ? new URLSearchParams(params).toString() : undefined,
        signal: AbortSignal.timeout(15_000),
    })
    const json: any = await res.json()
    if (!res.ok) throw new Error(`Stripe ${path} failed: ${json?.error?.code ?? res.status}`)
    return json
}

export function verifyWebhook(payload: string, header: string | undefined, secret: string, now = Date.now()): boolean {
    const parts = Object.fromEntries((header ?? "").split(",").map(p => p.split("=") as [string, string]))
    const timestamp = Number(parts.t)
    if (!timestamp || !parts.v1 || Math.abs(now / 1000 - timestamp) > 300) return false
    const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest()
    const given = Buffer.from(parts.v1, "hex")
    return given.length === expected.length && timingSafeEqual(given, expected)
}

function newLicenceKey(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const chars = [...randomBytes(16)].map(b => alphabet[b % 32])
    return `SR-${chars.join("").replace(/(.{4})(?=.)/g, "$1-")}`
}

/** Turn a paid checkout session into a licence. Safe to call any number of times for the same session. */
export async function fulfil(db: Db, session: any): Promise<string | null> {
    const plan = session?.metadata?.plan as Plan | undefined
    if (session?.payment_status !== "paid" || !plan || !(plan in PLANS)) return null
    await db.query(
        `insert into licences (key, plan, max_sites, email, stripe_customer_id, stripe_session_id, stripe_subscription_id, expires_at)
         values ($1,$2,$3,$4,$5,$6,$7, now() + interval '1 year' + make_interval(days => $8))
         on conflict (stripe_session_id) do nothing`,
        [newLicenceKey(), plan, PLANS[plan].maxSites, session.customer_details?.email ?? null, session.customer ?? null, session.id,
         session.subscription ?? null, GRACE_DAYS]
    )
    const { rows } = await db.query(`select key from licences where stripe_session_id = $1 and status = 'active'`, [session.id])
    return rows[0]?.key ?? null
}

/** A renewal invoice was paid: the licence runs until the end of the period it paid for. */
async function renew(db: Db, invoice: any): Promise<void> {
    const subscription = invoice?.subscription ?? invoice?.parent?.subscription_details?.subscription
    const periodEnd = Math.max(0, ...(invoice?.lines?.data ?? []).map((l: any) => Number(l?.period?.end) || 0))
    if (typeof subscription !== "string" || !periodEnd) return
    await db.query(
        `update licences set expires_at = greatest(expires_at, to_timestamp($2) + make_interval(days => $3)), status = 'active'
         where stripe_subscription_id = $1 and status <> 'refunded'`,
        [subscription, periodEnd, GRACE_DAYS]
    )
}

export function createBilling(db: Db, config: StripeConfig): Hono {
    const app = new Hono()

    const priceIds = new Map<Plan, string>()
    const priceFor = async (plan: Plan): Promise<string> => {
        const cached = priceIds.get(plan)
        if (cached) return cached
        const list = await stripe(config, "GET", `/prices?active=true&lookup_keys[]=${PLANS[plan].lookupKey}`)
        const id = list?.data?.[0]?.id
        if (typeof id !== "string") throw new Error(`No Stripe price with lookup key ${PLANS[plan].lookupKey}`)
        priceIds.set(plan, id)
        return id
    }

    /** Landing page buy button: /buy?plan=site or /buy?plan=agency. A yearly subscription with tax worked out by Stripe. */
    app.get("/buy", async c => {
        const plan = (c.req.query("plan") ?? "site") as Plan
        if (!(plan in PLANS)) return c.text("Unknown plan", 400)
        const session = await stripe(config, "POST", "/checkout/sessions", {
            mode: "subscription",
            "line_items[0][quantity]": "1",
            "line_items[0][price]": await priceFor(plan),
            "automatic_tax[enabled]": "true",
            "tax_id_collection[enabled]": "true",
            billing_address_collection: "required",
            "metadata[plan]": plan,
            "metadata[product]": "syncroles",
            "subscription_data[metadata][plan]": plan,
            "subscription_data[metadata][product]": "syncroles",
            allow_promotion_codes: "true",
            success_url: `${config.siteUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.siteUrl}/#pricing`,
        })
        return c.redirect(session.url, 303)
    })

    app.post("/stripe/webhook", async c => {
        const payload = await c.req.text()
        if (!verifyWebhook(payload, c.req.header("stripe-signature"), config.webhookSecret)) return c.text("Bad signature", 400)
        const event = JSON.parse(payload)
        const object = event.data?.object
        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
            await fulfil(db, object)
        } else if (event.type === "invoice.paid") {
            await renew(db, object)
        } else if (event.type === "customer.subscription.deleted") {
            // Cancelled or unpaid to the end: scheduling stops and the site falls back to manual sync.
            await db.query(`update licences set status = 'expired' where stripe_subscription_id = $1 and status = 'active'`, [object?.id])
        } else if (event.type === "charge.refunded" && object?.refunded === true && typeof object.customer === "string") {
            // A full refund revokes the licence when it is unambiguous which one was refunded.
            const { rowCount } = await db.query(
                `update licences set status = 'refunded'
                 where stripe_customer_id = $1 and status = 'active'
                   and (select count(*) from licences where stripe_customer_id = $1 and status = 'active') = 1`,
                [object.customer]
            )
            if (!rowCount) console.log("refund without a single matching licence: review in Stripe")
        }
        return c.json({ received: true })
    })

    /** The thank-you page asks for its licence key. The session id in the URL is the secret. */
    app.get("/api/licence", async c => {
        const id = c.req.query("session_id") ?? ""
        if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(id)) return c.json({ error: "Unknown checkout session." }, 400)
        // Ask Stripe directly so the page works even if the webhook has not arrived yet.
        const session = await stripe(config, "GET", `/checkout/sessions/${id}`).catch(() => null)
        const key = session ? await fulfil(db, session) : null
        if (!key) return c.json({ error: "This payment is not completed yet. Reload in a moment." }, 404)
        return c.json({ key, plan: session.metadata.plan })
    })

    return app
}
