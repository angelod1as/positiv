import { describe, expect, it } from "vitest"
import { loader } from "./dashboard-page"

describe("Dashboard Page Loader", () => {
  it("should return null (events fetched client-side)", async () => {
    const result = await loader()
    expect(result).toBeNull()
  })
})
