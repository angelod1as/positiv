import { beforeEach, describe, expect, it, vi } from "vitest"
import { siteSettingsDocument } from "~/test/site-settings-documents"
import { createContentCache } from "./content-cache.server"
import { siteSettingsSchema } from "./site-settings.schema"
import {
  loadSiteSettings,
  SITE_SETTINGS_TIMEOUT_MS,
} from "./site-settings.server"
import type { SiteSnapshot } from "./site-snapshot.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn() },
}))

const siteSettings = siteSettingsSchema.parse(siteSettingsDocument())

const snapshot = (settings: SiteSnapshot["siteSettings"]): SiteSnapshot => ({
  pages: new Map(),
  siteSettings: settings,
})

const load = vi.fn<() => Promise<SiteSnapshot>>()

beforeEach(() => {
  vi.useRealTimers()
  load.mockReset()
})

describe("loadSiteSettings", () => {
  it("returns the Site Settings from the snapshot", async () => {
    load.mockResolvedValue(snapshot(siteSettings))

    expect(await loadSiteSettings({ get: load })).toEqual(siteSettings)
  })

  it("returns null when the Site Settings document is missing", async () => {
    load.mockResolvedValue(snapshot(null))

    expect(await loadSiteSettings({ get: load })).toBeNull()
  })

  it("returns null rather than throwing when Sanity is unreachable on a cold start", async () => {
    load.mockRejectedValue(new Error("connect ECONNREFUSED"))

    expect(await loadSiteSettings({ get: load })).toBeNull()
  })

  it("returns null rather than waiting when Sanity is slow on a cold start", async () => {
    vi.useFakeTimers()
    load.mockReturnValue(new Promise(() => {}))

    const settings = loadSiteSettings({ get: load })
    await vi.advanceTimersByTimeAsync(SITE_SETTINGS_TIMEOUT_MS)

    expect(await settings).toBeNull()
  })

  it("returns the Site Settings when Sanity answers within the time limit", async () => {
    vi.useFakeTimers()
    load.mockReturnValue(
      new Promise((resolve) =>
        setTimeout(
          () => resolve(snapshot(siteSettings)),
          SITE_SETTINGS_TIMEOUT_MS - 1,
        ),
      ),
    )

    const settings = loadSiteSettings({ get: load })
    await vi.advanceTimersByTimeAsync(SITE_SETTINGS_TIMEOUT_MS - 1)

    expect(await settings).toEqual(siteSettings)
  })

  it("keeps serving stale Site Settings when a refresh fails", async () => {
    vi.useFakeTimers()
    const cache = createContentCache({ name: "test", load, ttlMs: 1_000 })
    load.mockResolvedValueOnce(snapshot(siteSettings))
    await loadSiteSettings(cache)

    vi.advanceTimersByTime(1_001)
    load.mockRejectedValueOnce(new Error("Sanity is down"))

    expect(await loadSiteSettings(cache)).toEqual(siteSettings)
    expect(load).toHaveBeenCalledTimes(2)
  })
})
