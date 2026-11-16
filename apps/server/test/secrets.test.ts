import { randomBytes } from "node:crypto"
import { beforeEach, describe, expect, it } from "vitest"
import { decryptSecret, encryptSecret, maskSecret } from "../src/secrets.js"

beforeEach(() => {
    process.env.SECRETS_KEY = randomBytes(32).toString("base64")
})

describe("secrets", () => {
    it("round-trips and never stores the plaintext", () => {
        const key = "3f2b8c1e-aaaa-bbbb-cccc-1234567890ab"
        const stored = encryptSecret(key)
        expect(stored).not.toContain(key)
        expect(decryptSecret(stored)).toBe(key)
    })
    it("uses a fresh nonce each time", () => {
        expect(encryptSecret("same")).not.toBe(encryptSecret("same"))
    })
    it("rejects a tampered value and a wrong master key without leaking it", () => {
        const stored = encryptSecret("secret-value")
        const tampered = stored.slice(0, -2) + (stored.endsWith("AA") ? "BB" : "AA")
        expect(() => decryptSecret(tampered)).toThrow(/could not be decrypted/)
        process.env.SECRETS_KEY = randomBytes(32).toString("base64")
        expect(() => decryptSecret(stored)).toThrow(/could not be decrypted/)
    })
    it("refuses to work without a proper master key", () => {
        process.env.SECRETS_KEY = "short"
        expect(() => encryptSecret("x")).toThrow(/SECRETS_KEY/)
    })
    it("masks keys for display", () => {
        expect(maskSecret("3f2b8c1e-aaaa-bbbb-cccc-1234567890ab")).toBe("••••90ab")
        expect(maskSecret("short")).toBe("••••")
    })
})
