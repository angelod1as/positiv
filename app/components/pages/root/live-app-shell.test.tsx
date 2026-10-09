import { beforeEach, describe, expect, it, vi } from "vitest"
import { useQuery } from "~/business/cms/live-loader"
import { siteSettingsSchema } from "~/business/cms/site-settings.schema"
import { siteSettingsDocument } from "~/test/site-settings-documents"
import { LiveAppShell } from "./live-app-shell"

vi.mock("~/business/cms/live-loader", () => ({ useQuery: vi.fn() }))

const snapshot = {
  initial: { data: null } as never,
  query: "the-snapshot-query",
  params: {} as Record<string, never>,
}

function liveWith(data: unknown) {
  vi.mocked(useQuery).mockReturnValue({ data } as unknown as ReturnType<
    typeof useQuery
  >)
}

describe("LiveAppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("subscribes to the snapshot query and renders the resolved Site Settings", () => {
    liveWith({ pages: [], siteSettings: siteSettingsDocument() })
    const render = vi.fn(() => null)

    LiveAppShell({ snapshot, render })

    expect(useQuery).toHaveBeenCalledWith(
      "the-snapshot-query",
      {},
      { initial: { data: null } },
    )
    expect(render).toHaveBeenCalledWith(
      siteSettingsSchema.parse(siteSettingsDocument()),
    )
  })

  it("renders the chrome with no Site Settings when the live data has none", () => {
    liveWith({ pages: [], siteSettings: null })
    const render = vi.fn(() => null)

    LiveAppShell({ snapshot, render })

    expect(render).toHaveBeenCalledWith(null)
  })

  it("falls back to no Site Settings when a half-saved edit fails validation", () => {
    liveWith({ pages: [], siteSettings: { navigation: "not-an-array" } })
    const render = vi.fn(() => null)

    LiveAppShell({ snapshot, render })

    expect(render).toHaveBeenCalledWith(null)
  })
})
