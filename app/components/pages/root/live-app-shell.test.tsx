import { beforeEach, describe, expect, it, vi } from "vitest"
import { useQuery } from "~/business/cms/live-loader"
import { siteSettingsSchema } from "~/business/cms/site-settings.schema"
import { render } from "~/test/test-utils"
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

  it("subscribes to the snapshot query and reports the resolved Site Settings", () => {
    liveWith({ pages: [], siteSettings: siteSettingsDocument() })
    const onSiteSettings = vi.fn()

    render(<LiveAppShell snapshot={snapshot} onSiteSettings={onSiteSettings} />)

    expect(useQuery).toHaveBeenCalledWith(
      "the-snapshot-query",
      {},
      { initial: { data: null } },
    )
    expect(onSiteSettings).toHaveBeenCalledWith(
      siteSettingsSchema.parse(siteSettingsDocument()),
    )
  })

  it("reports no Site Settings when the live data has none", () => {
    liveWith({ pages: [], siteSettings: null })
    const onSiteSettings = vi.fn()

    render(<LiveAppShell snapshot={snapshot} onSiteSettings={onSiteSettings} />)

    expect(onSiteSettings).toHaveBeenCalledWith(null)
  })

  it("keeps the last good Site Settings when a half-saved edit fails validation", () => {
    liveWith({ pages: [], siteSettings: { navigation: "not-an-array" } })
    const onSiteSettings = vi.fn()

    render(<LiveAppShell snapshot={snapshot} onSiteSettings={onSiteSettings} />)

    // An invalid transient edit must not blank the chrome — it reports nothing,
    // so the last good Site Settings stay, matching PageRoute's last-good Page.
    expect(onSiteSettings).not.toHaveBeenCalled()
  })
})
