import { describe, expect, it } from "vitest"
import { createMetaArray, createPageTitle } from "./meta"

describe("meta helpers", () => {
  describe("createPageTitle", () => {
    it("should return just 'Positiv Party' for homepage", () => {
      expect(createPageTitle("Positiv Party")).toBe("Positiv Party")
    })

    it("should append ' | Positiv Party' to other pages", () => {
      expect(createPageTitle("Meus Eventos")).toBe("Meus Eventos | Positiv Party")
    })

    it("should handle admin pages", () => {
      expect(createPageTitle("Admin - Visão Geral")).toBe(
        "Admin - Visão Geral | Positiv Party",
      )
    })
  })

  describe("createMetaArray", () => {
    it("should create meta array with title and og:title", () => {
      const result = createMetaArray("Meus Eventos")

      expect(result).toEqual([
        { title: "Meus Eventos | Positiv Party" },
        { property: "og:title", content: "Meus Eventos | Positiv Party" },
      ])
    })

    it("should handle homepage correctly", () => {
      const result = createMetaArray("Positiv Party")

      expect(result).toEqual([
        { title: "Positiv Party" },
        { property: "og:title", content: "Positiv Party" },
      ])
    })
  })
})
