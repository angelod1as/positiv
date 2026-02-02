import { describe, expect, it } from "vitest"
import { meta } from "./dashboard-page"

describe("Dashboard page meta function", () => {
  it("should return correct page title", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaResult = meta({} as any)

    const titleMeta = metaResult.find((m) => "title" in m)

    expect(titleMeta).toBeDefined()
    expect(titleMeta).toEqual({ title: "Meus Eventos | Positiv Party" })
  })

  it("should set og:title", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaResult = meta({} as any)

    const ogTitleMeta = metaResult.find(
      (m) => "property" in m && m.property === "og:title",
    )

    expect(ogTitleMeta).toBeDefined()
    expect(ogTitleMeta).toMatchObject({
      property: "og:title",
      content: "Meus Eventos | Positiv Party",
    })
  })
})
