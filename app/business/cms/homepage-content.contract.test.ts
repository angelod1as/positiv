import { describe, expect, it } from "vitest"
import { homepageContentSchema } from "./homepage-content.schema"
import { getHomepageContent } from "./homepage-content.server"
import { createProductionReadClient } from "./production-read-client.server"

describe("published homepage in the production dataset", () => {
  it("satisfies the homepage contract", async () => {
    const content = await getHomepageContent(createProductionReadClient())

    expect(homepageContentSchema.parse(content)).toEqual(content)
  })

  it("points every founder photo at an image the CDN serves", async () => {
    const content = await getHomepageContent(createProductionReadClient())

    for (const { photo } of content.founders.people) {
      expect(photo.url).toMatch(
        /^https:\/\/cdn\.sanity\.io\/images\/8ojkallk\/production\//,
      )
      const response = await fetch(photo.url, { method: "HEAD" })
      expect(response.status, photo.url).toBe(200)
    }
  })
})
