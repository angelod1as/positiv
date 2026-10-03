import { describe, expect, it } from "vitest"
import { pageSchema } from "./page.schema"
import { getPagesSnapshot } from "./pages-snapshot.server"
import { createProductionReadClient } from "./production-read-client.server"

describe("published Pages in the production dataset", () => {
  it("satisfy the Page contract, all of them", async () => {
    const snapshot = await getPagesSnapshot(createProductionReadClient())

    for (const page of snapshot.values()) {
      expect(pageSchema.parse(page)).toEqual(page)
    }
  })

  it("point every image at a file the CDN serves", async () => {
    const snapshot = await getPagesSnapshot(createProductionReadClient())

    const urls = [...snapshot.values()].flatMap((page) => [
      ...(page.seo.image ? [page.seo.image.url] : []),
      ...page.sections.flatMap((section) => {
        switch (section._type) {
          case "founders":
            return section.people.map(({ photo }) => photo.url)
          case "imageSection":
            return [section.image.url]
          default:
            return []
        }
      }),
    ])
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
