import { describe, expect, it } from "vitest"
import { createProductionReadClient } from "./production-read-client.server"
import { getSiteSnapshot } from "./site-snapshot.server"

describe("published Site Settings in the production dataset", () => {
  it("exist and satisfy the Site Settings contract", async () => {
    const { siteSettings } = await getSiteSnapshot(createProductionReadClient())

    expect(siteSettings).not.toBeNull()
  })
})
