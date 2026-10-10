import { beforeEach, describe, expect, it, vi } from "vitest"
import { VisualEditing as SanityVisualEditing } from "@sanity/visual-editing/react-router"
import { useLiveMode } from "~/business/cms/live-loader"
import { render } from "~/test/test-utils"
import { VisualEditing } from "./visual-editing"

vi.mock("@sanity/visual-editing/react-router", () => ({
  VisualEditing: vi.fn(() => null),
}))

vi.mock("~/business/cms/live-loader", () => ({ useLiveMode: vi.fn() }))

const clientConfig = {
  projectId: "8ojkallk",
  dataset: "development",
  apiVersion: "2026-09-24",
}

describe("VisualEditing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("draws the overlays and opens the live-mode connection", () => {
    render(<VisualEditing clientConfig={clientConfig} />)

    expect(SanityVisualEditing).toHaveBeenCalled()
    expect(useLiveMode).toHaveBeenCalled()
  })

  it("disables loader revalidation so only live mode updates the preview", () => {
    render(<VisualEditing clientConfig={clientConfig} />)

    const props = vi.mocked(SanityVisualEditing).mock.lastCall?.[0]
    expect(props?.refresh?.({} as never, () => false)).toBe(false)
  })

  it("drives live mode with a publishable client that carries no token", () => {
    render(<VisualEditing clientConfig={clientConfig} />)

    const config = vi.mocked(useLiveMode).mock.lastCall?.[0]?.client?.config()
    expect(config).toBeDefined()
    expect(config?.projectId).toBe("8ojkallk")
    expect(config?.dataset).toBe("development")
    expect(config?.useCdn).toBe(false)
    expect(config?.token).toBeUndefined()
  })
})
