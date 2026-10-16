import { describe, expect, it } from "vitest"
import { createProductionReadClient } from "./production-read-client.server"
import { getSiteSnapshot } from "./site-snapshot.server"

describe("published Payment Messages in the production dataset", () => {
  it("exist and satisfy the payment messages contract", async () => {
    const { paymentMessages } = await getSiteSnapshot(
      createProductionReadClient(),
    )

    expect(paymentMessages).not.toBeNull()
  })
})
