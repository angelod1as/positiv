import { describe, expect, it } from "vitest"

import { resolve } from "./presentation"

const locations = resolve.locations as Record<
  string,
  { resolve: (doc: unknown) => { locations: { title: string; href: string }[]; message?: string } }
>

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
    const result = locations.siteSettings.resolve({})

    expect(result.message).toContain("todas as páginas")
    expect(result.locations).toEqual([{ title: "Página inicial", href: "/" }])
  })
})
