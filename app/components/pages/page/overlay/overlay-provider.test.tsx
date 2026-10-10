import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { useOverlay } from "./overlay-context"
import { OverlayProvider } from "./overlay-provider"

function Probe() {
  const overlay = useOverlay()
  if (!overlay) return <div data-testid="probe">no overlay</div>
  return (
    <div
      data-testid="probe"
      data-sanity={overlay.dataAttribute({
        type: "person",
        id: overlay.pageId,
        path: "photo",
      })}
    />
  )
}

describe("OverlayProvider", () => {
  it("builds a data attribute that names the document and the Studio", () => {
    render(
      <OverlayProvider pageId="page-1" studioUrl="https://positiv.sanity.studio">
        <Probe />
      </OverlayProvider>,
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
