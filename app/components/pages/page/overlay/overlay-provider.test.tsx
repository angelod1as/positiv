import { describe, expect, it } from "vitest"
import { render, screen, waitFor } from "~/test/test-utils"
import { useOverlay } from "./overlay-context"
import { OverlayProvider } from "./overlay-provider"

function Probe() {
  const overlay = useOverlay()
  return (
    <div
      data-testid="probe"
      data-sanity={
        overlay
          ? overlay.dataAttribute({
              type: "person",
              id: overlay.pageId,
              path: "photo",
            })
          : undefined
      }
    >
      {overlay ? "overlay" : "no overlay"}
    </div>
  )
}

describe("OverlayProvider", () => {
  it("renders children at once and fills the data attribute once the chunk loads", async () => {
    render(
      <OverlayProvider pageId="page-1" studioUrl="https://positiv.sanity.studio">
        <Probe />
      </OverlayProvider>,
    )

    // Children paint immediately in a fixed tree position: the builder is behind
    // a dynamic import, so the context is null on the first render and the page
    // never suspends or remounts waiting for the chunk.
    expect(screen.getByTestId("probe").textContent).toBe("no overlay")

    await waitFor(() =>
      expect(screen.getByTestId("probe").textContent).toBe("overlay"),
    )

    const attr = screen.getByTestId("probe").getAttribute("data-sanity")
    expect(attr).toContain("id=page-1")
    expect(attr).toContain("type=person")
    expect(attr).toContain("path=photo")
    expect(attr).toContain("positiv.sanity.studio")
  })

  it("gives no overlay outside the provider, so published pages carry nothing", () => {
    render(<Probe />)

    expect(screen.getByTestId("probe").textContent).toBe("no overlay")
  })
})
