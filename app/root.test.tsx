import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    Meta: () => null,
    Links: () => null,
    ScrollRestoration: () => null,
    Scripts: () => null,
  }
})

vi.mock("sonner", () => ({
  Toaster: () => null,
}))

vi.mock("~/components/atoms/global-loading/global-loading", () => ({
  GlobalLoading: () => null,
}))

vi.mock("~/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

describe("Layout", () => {
  describe("Umami Analytics Script", () => {
    it("should render Umami script when VITE_UMAMI_WEBSITE_ID is set", async () => {
      vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "test-website-id-123")
      vi.stubEnv("VITE_UMAMI_URL", "https://umami.example.com")

      vi.resetModules()
      const { Layout } = await import("./root")

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>,
      )

      const umamiScript = document.querySelector(
        'script[data-website-id="test-website-id-123"]',
      )
      expect(umamiScript).toBeInTheDocument()
      expect(umamiScript).toHaveAttribute(
        "src",
        "https://umami.example.com/script.js",
      )
      expect(umamiScript).toHaveAttribute("defer")
    })

    it("should not render Umami script when VITE_UMAMI_WEBSITE_ID is not set", async () => {
      vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "")
      vi.stubEnv("VITE_UMAMI_URL", "")

      vi.resetModules()
      const { Layout } = await import("./root")

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>,
      )

      const umamiScript = document.querySelector("script[data-website-id]")
      expect(umamiScript).not.toBeInTheDocument()
    })
  })
})
