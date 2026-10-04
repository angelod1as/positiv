import { describe, expect, it } from "vitest"
import { createProductionReadClient } from "./production-read-client.server"
import { getSiteSnapshot } from "./site-snapshot.server"

describe("published Site Settings in the production dataset", () => {
  it("exist and satisfy the Site Settings contract", async () => {
    const { siteSettings } = await getSiteSnapshot(createProductionReadClient())

    expect(siteSettings).not.toBeNull()
  })

  it("point every link somewhere", async () => {
    const { siteSettings } = await getSiteSnapshot(createProductionReadClient())

    const links = [
      ...(siteSettings?.navigation ?? []),
      ...(siteSettings?.footer.columns.flatMap(({ links }) => links) ?? []),
    ]
    for (const { label, href } of links) {
      expect(href, label).not.toBe("")
    }
  })
})
