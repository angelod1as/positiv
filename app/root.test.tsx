import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { renderWithRouter, screen } from "~/test/test-utils"
import type { Route } from "./+types/root"

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

vi.mock("~/components/organisms/header/header", () => ({ Header: () => null }))
vi.mock("~/components/organisms/footer/footer", () => ({ Footer: () => null }))
vi.mock(
  "~/components/organisms/profile-update-guard/profile-update-guard",
  () => ({ ProfileUpdateGuard: () => null }),
)
vi.mock("~/components/organisms/newsletter-subscription-modal", () => ({
  NewsletterSubscriptionModal: () => null,
}))

vi.mock("./components/pages/root/visual-editing", () => ({
  VisualEditing: () => <div data-testid="visual-editing" />,
}))

vi.mock("./components/pages/root/live-app-shell", () => ({
  LiveAppShell: ({ render }: { render: (s: null) => React.ReactNode }) =>
    render(null),
}))

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

describe("Layout", () => {
  describe("Umami Analytics Script", () => {
    it("should render Umami script when VITE_UMAMI_WEBSITE_ID is set", { timeout: 30000 }, async () => {
      ENV.VITE_UMAMI_WEBSITE_ID = "test-website-id-123"
      ENV.VITE_UMAMI_URL = "https://umami.example.com"

      vi.resetModules()
      const { Layout } = await import("./root")

      const document = new DOMParser().parseFromString(
        renderToStaticMarkup(
          <Layout>
            <div>Test Content</div>
          </Layout>,
        ),
        "text/html",
      )

      const umamiScript = document.querySelector(
        'script[data-website-id="test-website-id-123"]',
      )
      expect(umamiScript).not.toBeNull()
      expect(umamiScript?.getAttribute("src")).toBe(
        "https://umami.example.com/script.js",
      )
      expect(umamiScript?.hasAttribute("defer")).toBe(true)
    })

    it("should not render Umami script when VITE_UMAMI_WEBSITE_ID is not set", { timeout: 15000 }, async () => {
      ENV.VITE_UMAMI_WEBSITE_ID = ""
      ENV.VITE_UMAMI_URL = ""

      vi.resetModules()
      const { Layout } = await import("./root")

      const document = new DOMParser().parseFromString(
        renderToStaticMarkup(
          <Layout>
            <div>Test Content</div>
          </Layout>,
        ),
        "text/html",
      )

      const umamiScript = document.querySelector("script[data-website-id]")
      expect(umamiScript).toBeNull()
    })
  })
})

describe("App visual editing", () => {
  async function renderApp(draftMode: boolean) {
    vi.resetModules()
    const { default: App } = await import("./root")
    const liveSnapshot = draftMode
      ? {
          initial: { data: null },
          query: "the-snapshot-query",
          params: {},
          clientConfig: {
            projectId: "8ojkallk",
            dataset: "development",
            apiVersion: "2026-09-24",
          },
        }
      : undefined
    renderWithRouter(
      <App
        {...({
          loaderData: { draftMode, liveSnapshot, siteSettings: null },
        } as Route.ComponentProps)}
      />,
    )
  }

  it("mounts the visual editing runtime in draft mode", { timeout: 15000 }, async () => {
    await renderApp(true)

    expect(await screen.findByTestId("visual-editing")).toBeInTheDocument()
  })

  it("never mounts the visual editing runtime for a visitor", { timeout: 15000 }, async () => {
    await renderApp(false)

    expect(screen.queryByTestId("visual-editing")).not.toBeInTheDocument()
  })
})
