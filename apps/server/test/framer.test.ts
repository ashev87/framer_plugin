import { describe, expect, it } from "vitest"
import { FIELDS, fieldsMatch } from "../src/framer.js"

describe("Framer collection fields", () => {
    it("keeps the ids customers' pages are already bound to", () => {
        const ids = FIELDS.map(f => f.id)
        for (const id of ["title", "department", "location", "employmentType", "description", "applyUrl", "publishedAt", "syncHash"]) {
            expect(ids).toContain(id)
        }
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("uses the same names as Framer's Ashby plugin for shared fields", () => {
        const names = Object.fromEntries(FIELDS.map(f => [f.id, f.name]))
        expect(names).toMatchObject({
            team: "Team",
            jobUrl: "Job URL",
            applyUrl: "Apply URL",
            isRemote: "Remote",
            compensation: "Compensation",
            publishedAt: "Published At",
            employmentType: "Employment Type",
        })
    })

    it("asks for an update when only a name changed", () => {
        const current = FIELDS.map(f => ({ id: f.id, name: f.name, type: f.type }))
        expect(fieldsMatch(current)).toBe(true)
        const renamed = current.map(f => (f.id === "publishedAt" ? { ...f, name: "Published" } : f))
        expect(fieldsMatch(renamed)).toBe(false)
        expect(fieldsMatch(current.slice(0, -1))).toBe(false)
    })
})
