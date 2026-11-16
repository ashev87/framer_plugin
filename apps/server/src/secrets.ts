import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

/**
 * Customer Framer API keys at rest: AES-256-GCM with a random nonce per value.
 * The master key lives only in the SECRETS_KEY environment variable
 * (32 bytes, base64). Stored form: v1.<nonce>.<tag>.<ciphertext>, base64url.
 * Nothing in this module logs, and errors never include the plaintext.
 */
function masterKey(): Buffer {
    const raw = process.env.SECRETS_KEY
    const key = raw ? Buffer.from(raw, "base64") : Buffer.alloc(0)
    if (key.length !== 32) throw new Error("SECRETS_KEY must be set to 32 random bytes, base64-encoded.")
    return key
}

export function encryptSecret(plaintext: string): string {
    const nonce = randomBytes(12)
    const cipher = createCipheriv("aes-256-gcm", masterKey(), nonce)
    const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
    return ["v1", nonce, cipher.getAuthTag(), body].map(p => (typeof p === "string" ? p : p.toString("base64url"))).join(".")
}

export function decryptSecret(stored: string): string {
    const [version, nonce, tag, body] = stored.split(".")
    if (version !== "v1" || !nonce || !tag || body === undefined) throw new Error("Stored secret has an unknown format.")
    try {
        const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(nonce, "base64url"))
        decipher.setAuthTag(Buffer.from(tag, "base64url"))
        return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8")
    } catch {
        throw new Error("Stored secret could not be decrypted (wrong master key or corrupted value).")
    }
}

/** For showing a customer which key is connected without revealing it. */
export function maskSecret(plaintext: string): string {
    return plaintext.length <= 8 ? "••••" : `••••${plaintext.slice(-4)}`
}
