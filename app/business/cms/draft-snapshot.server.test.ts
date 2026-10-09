import { describe, expect, it, vi } from "vitest"

const getSiteSnapshot = vi.hoisted(() => vi.fn())
const createDraftReadClient = vi.hoisted(() => vi.fn())

vi.mock("./site-snapshot.server", () => ({ getSiteSnapshot }))
vi.mock("./draft-read-client.server", () => ({ createDraftReadClient }))

import { getDraftSiteSnapshot } from "./draft-snapshot.server"

describe("getDraftSiteSnapshot", () => {
  it("reads the snapshot through the draft client by default", async () => {
    const draftClient = { fetch: vi.fn(), config: vi.fn() }
    createDraftReadClient.mockReturnValue(draftClient)
    const snapshot = { pages: new Map(), siteSettings: null }
    getSiteSnapshot.mockResolvedValue(snapshot)

    await expect(getDraftSiteSnapshot()).resolves.toBe(snapshot)
    expect(getSiteSnapshot).toHaveBeenCalledWith(draftClient, "draft")
  })
})
