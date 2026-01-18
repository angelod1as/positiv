import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import userEvent from "@testing-library/user-event"
import { useAnalytics } from "./use-analytics"

function TestComponent() {
  const { track } = useAnalytics()

  return (
    <button
      onClick={() => track("test_event", { key: "value" })}
      data-testid="track-button"
    >
      Track Event
    </button>
  )
}

describe("useAnalytics", () => {
  const mockTrack = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("window", {
      umami: {
        track: mockTrack,
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("should call trackEvent when track is invoked", async () => {
    const user = userEvent.setup()
    render(<TestComponent />)

    await user.click(screen.getByTestId("track-button"))

    expect(mockTrack).toHaveBeenCalledTimes(1)
    expect(mockTrack).toHaveBeenCalledWith("test_event", { key: "value" })
  })

  it("should return stable function references across re-renders", async () => {
    type TrackFn = (event: string, data?: Record<string, unknown>) => void
    let trackRef1: TrackFn | undefined
    let trackRef2: TrackFn | undefined

    function TrackingRefComponent() {
      const { track } = useAnalytics()

      if (!trackRef1) {
        trackRef1 = track
      } else if (!trackRef2) {
        trackRef2 = track
      }

      return <button onClick={() => track("event")}>Click</button>
    }

    const { rerender } = render(<TrackingRefComponent />)
    rerender(<TrackingRefComponent />)

    expect(trackRef1).toBe(trackRef2)
  })
})
