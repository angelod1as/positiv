import { describe, expect, it } from "vitest"
import { meta } from "./register-page"

describe("Register page meta function", () => {
  it("should return correct page title", () => {
    const metaResult = meta({})

    const titleMeta = metaResult.find((m) => "title" in m)

    expect(titleMeta).toBeDefined()
    expect(titleMeta).toEqual({ title: "Registrar | Positiv Party" })
  })

  it("should set og:title", () => {
    const metaResult = meta({})

    const ogTitleMeta = metaResult.find(
      (m) => "property" in m && m.property === "og:title",
    )

    expect(ogTitleMeta).toBeDefined()
    expect(ogTitleMeta).toMatchObject({
      property: "og:title",
      content: "Registrar | Positiv Party",
    })
  })
})
