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

    const urls = content.founders.people.map(({ photo }) => photo.url)
    for (const url of urls) {
      expect(url).toMatch(
        /^https:\/\/cdn\.sanity\.io\/images\/8ojkallk\/production\//,
      )
    }

    const responses = await Promise.all(
      urls.map((url) => fetch(url, { method: "HEAD" })),
    )
    responses.forEach((response, index) => {
      expect(response.status, urls[index]).toBe(200)
    })
  })
})
