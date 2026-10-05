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

    expect(await loadSiteSettings({ get: load })).toEqual({
      siteSettings,
      editorialSystemUnavailable: false,
    })
  })

  it("returns no Site Settings, with the editorial system available, when the document is missing", async () => {
    load.mockResolvedValue(snapshot(null))

    expect(await loadSiteSettings({ get: load })).toEqual({
      siteSettings: null,
      editorialSystemUnavailable: false,
    })
  })

  it("reports the editorial system unavailable, rather than throwing, when Sanity is unreachable on a cold start", async () => {
    load.mockRejectedValue(new Error("connect ECONNREFUSED"))

    expect(await loadSiteSettings({ get: load })).toEqual({
      siteSettings: null,
      editorialSystemUnavailable: true,
    })
  })

  it("reports the editorial system unavailable, rather than waiting, when Sanity is slow on a cold start", async () => {
    vi.useFakeTimers()
    load.mockReturnValue(new Promise(() => {}))

    const settings = loadSiteSettings({ get: load })
    await vi.advanceTimersByTimeAsync(SITE_SETTINGS_TIMEOUT_MS)

    expect(await settings).toEqual({
      siteSettings: null,
      editorialSystemUnavailable: true,
    })
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

    expect(await settings).toEqual({
      siteSettings,
      editorialSystemUnavailable: false,
    })
  })

  it("keeps serving stale Site Settings when a refresh fails", async () => {
    vi.useFakeTimers()
    const cache = createContentCache({ name: "test", load, ttlMs: 1_000 })
    load.mockResolvedValueOnce(snapshot(siteSettings))
    await loadSiteSettings(cache)

    vi.advanceTimersByTime(1_001)
    load.mockRejectedValueOnce(new Error("Sanity is down"))

    expect(await loadSiteSettings(cache)).toEqual({
      siteSettings,
      editorialSystemUnavailable: false,
    })
    expect(load).toHaveBeenCalledTimes(2)
  })
})
