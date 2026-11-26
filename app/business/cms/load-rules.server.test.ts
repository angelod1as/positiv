import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/business/cms/rules-cache.server", () => ({
  rulesCache: { get: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn() },
}))

import { rulesCache } from "~/business/cms/rules-cache.server"
import { rulesFixture } from "~/test/rules-documents"
import { loadRules } from "./load-rules.server"

describe("loadRules", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("hands back the Rules the cache holds", async () => {
    vi.mocked(rulesCache.get).mockResolvedValue(rulesFixture)

    await expect(loadRules()).resolves.toEqual(rulesFixture)
  })

  it("hands back no Rules when Sanity cannot give them", async () => {
    vi.mocked(rulesCache.get).mockRejectedValue(new Error("Sanity is down"))

    await expect(loadRules()).resolves.toBeNull()
  })
})
