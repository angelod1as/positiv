import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { analyticsOptOutCopy } from "~/copy/privacy"
import { render, screen } from "~/test/test-utils"
import { AnalyticsOptOut } from "./analytics-opt-out"

// `umami.disabled` is the flag Umami's tracker reads before every send, and
// the recorder loader reads before adding the recorder.
describe("AnalyticsOptOut", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.removeItem("umami.disabled")
  })

  it("stops recording the visits of this browser, then reloads the page", async () => {
    const reload = vi.fn()
    render(<AnalyticsOptOut reload={reload} />)

    await userEvent.click(
      screen.getByRole("button", { name: analyticsOptOutCopy.optOut }),
    )

    expect(window.localStorage.getItem("umami.disabled")).toBe("1")
    expect(reload).toHaveBeenCalledOnce()
  })

  it("tells a visitor who already opted out, and lets them undo it", async () => {
    window.localStorage.setItem("umami.disabled", "1")
    const reload = vi.fn()
    render(<AnalyticsOptOut reload={reload} />)

    await userEvent.click(
      await screen.findByRole("button", { name: analyticsOptOutCopy.optIn }),
    )

    expect(window.localStorage.getItem("umami.disabled")).toBeNull()
    expect(reload).toHaveBeenCalledOnce()
  })

  it("says so, and does not reload, when the browser refuses to store the choice", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError")
    })
    const reload = vi.fn()
    render(<AnalyticsOptOut reload={reload} />)

    await userEvent.click(
      screen.getByRole("button", { name: analyticsOptOutCopy.optOut }),
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      analyticsOptOutCopy.storageFailed,
    )
    expect(reload).not.toHaveBeenCalled()
  })
})
