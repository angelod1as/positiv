import { beforeEach, describe, expect, it, vi } from "vitest"
import { enableVisualEditing } from "@sanity/visual-editing"
import { useLiveMode } from "~/business/cms/live-loader"
import { render } from "~/test/test-utils"
import { VisualEditing } from "./visual-editing"

vi.mock("@sanity/visual-editing", () => ({
  enableVisualEditing: vi.fn(() => () => {}),
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

    expect(enableVisualEditing).toHaveBeenCalled()
    expect(useLiveMode).toHaveBeenCalled()
  })

  it("drives live mode with a publishable client that carries no token", () => {
    render(<VisualEditing clientConfig={clientConfig} />)

    const { client } = vi.mocked(useLiveMode).mock.calls[0][0]
    const config = client.config()
    expect(config.projectId).toBe("8ojkallk")
    expect(config.dataset).toBe("development")
    expect(config.useCdn).toBe(false)
    expect(config.token).toBeUndefined()
  })
})
