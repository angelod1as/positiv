import { describe, expect, it } from "vitest"

import { resolve } from "./presentation"

type Location = { title: string; href: string }

const locations = (
  resolve as {
    locations: {
      page: {
        resolve: (doc: { title?: string; address?: string }) => {
          locations: Location[]
        }
      }
      siteSettings: { message?: string; locations: Location[] }
    }
  }
).locations

describe("Presentation locations", () => {
  it("places a Page at its own address", () => {
    const result = locations.page.resolve({ title: "Sobre", address: "/sobre" })

    expect(result.locations).toEqual([{ title: "Sobre", href: "/sobre" }])
  })

  it("falls back to the homepage when a Page has no address yet", () => {
    const result = locations.page.resolve({})

    expect(result.locations[0]?.href).toBe("/")
  })

  it("marks Site Settings as shown on every page", () => {
    expect(locations.siteSettings.message).toContain("todas as páginas")
    expect(locations.siteSettings.locations).toEqual([
      { title: "Página inicial", href: "/" },
    ])
  })
})
