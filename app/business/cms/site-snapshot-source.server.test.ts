import { beforeEach, describe, expect, it, vi } from "vitest"

const isDraftModeEnabled = vi.hoisted(() => vi.fn())
const getDraftSiteSnapshot = vi.hoisted(() => vi.fn())
const cacheGet = vi.hoisted(() => vi.fn())

vi.mock("./draft-mode.server", () => ({ isDraftModeEnabled }))
vi.mock("./draft-snapshot.server", () => ({ getDraftSiteSnapshot }))
vi.mock("./site-snapshot-cache.server", () => ({
  siteSnapshotCache: { get: cacheGet },
}))

import { loadSiteSnapshot } from "./site-snapshot-source.server"

const published = { pages: new Map(), siteSettings: { id: "published" } }
const draft = { pages: new Map(), siteSettings: { id: "draft" } }

beforeEach(() => {
  vi.clearAllMocks()
  cacheGet.mockResolvedValue(published)
  getDraftSiteSnapshot.mockResolvedValue(draft)
})

describe("loadSiteSnapshot", () => {
  it("serves the cached published snapshot to a visitor", async () => {
    isDraftModeEnabled.mockResolvedValue(false)

    await expect(loadSiteSnapshot(new Request("http://x/"))).resolves.toBe(
      published,
    )
    expect(getDraftSiteSnapshot).not.toHaveBeenCalled()
  })

  it("fetches the draft snapshot in draft mode, bypassing the cache", async () => {
    isDraftModeEnabled.mockResolvedValue(true)

    await expect(loadSiteSnapshot(new Request("http://x/"))).resolves.toBe(draft)
    expect(cacheGet).not.toHaveBeenCalled()
  })
})
