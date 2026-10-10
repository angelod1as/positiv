import { beforeEach, describe, expect, it, vi } from "vitest"
import { siteSettingsDocument } from "~/test/site-settings-documents"

const { loadSiteSettings } = vi.hoisted(() => ({ loadSiteSettings: vi.fn() }))
vi.mock("./site-settings.server", () => ({ loadSiteSettings }))
vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

import { siteSettingsFromDraft } from "./site-settings-from-draft.server"

describe("siteSettingsFromDraft", () => {
  beforeEach(() => {
    loadSiteSettings.mockReset()
  })

  it("resolves valid draft Site Settings without touching the published loader", async () => {
    const result = await siteSettingsFromDraft({
      siteSettings: siteSettingsDocument(),
    })

    expect(result.editorialSystemUnavailable).toBe(false)
    expect(result.siteSettings).not.toBeNull()
    expect(loadSiteSettings).not.toHaveBeenCalled()
  })

  it("degrades to the published snapshot when the draft Site Settings cannot be resolved", async () => {
    const published = { siteSettings: null, editorialSystemUnavailable: false }
    loadSiteSettings.mockResolvedValue(published)

    const result = await siteSettingsFromDraft({
      siteSettings: { navigation: "not-an-array" },
    })

    expect(loadSiteSettings).toHaveBeenCalledTimes(1)
    expect(result).toBe(published)
  })
})
