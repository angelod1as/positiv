import { describe, expect, it } from "vitest"
import { meta } from "./homepage"

describe("Homepage meta function", () => {
  it("should return Positiv Party as the page title", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaResult = meta({} as any)

    const titleMeta = metaResult.find(
      (m) => "title" in m && m.title === "Positiv Party",
    )

    expect(titleMeta).toBeDefined()
    expect(titleMeta).toEqual({ title: "Positiv Party" })
  })

  it("should set og:title to Positiv Party", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaResult = meta({} as any)

    const ogTitleMeta = metaResult.find(
      (m) => "property" in m && m.property === "og:title",
    )

    expect(ogTitleMeta).toBeDefined()
    expect(ogTitleMeta).toMatchObject({
      property: "og:title",
      content: "Positiv Party",
    })
  })
})
