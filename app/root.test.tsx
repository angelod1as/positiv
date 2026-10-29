import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { render, renderWithRouter, screen, waitFor } from "~/test/test-utils"
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

vi.mock("~/components/organisms/header/header", () => ({
  Header: ({ navigation }: { navigation?: Array<{ label?: string }> }) => (
    <div data-testid="chrome">{navigation?.[0]?.label ?? "NONE"}</div>
  ),
}))
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

const liveControl = vi.hoisted(() => ({
  report: false,
  value: undefined as unknown,
}))
vi.mock("./components/pages/root/live-app-shell", async () => {
  const { useEffect } = await import("react")
  return {
    LiveAppShell: ({
      onSiteSettings,
    }: {
      onSiteSettings: (value: unknown) => void
    }) => {
      useEffect(() => {
        if (liveControl.report) onSiteSettings(liveControl.value)
      }, [onSiteSettings])
      return null
    },
  }
})

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

describe("Layout", () => {
  describe("Umami Analytics Script", () => {
    async function renderLayout(path: string) {
      vi.resetModules()
      const { MemoryRouter } = await import("react-router")
      const { Layout } = await import("./root")

      return new DOMParser().parseFromString(
        renderToStaticMarkup(
          <MemoryRouter initialEntries={[path]}>
            <Layout>
              <div>Test Content</div>
            </Layout>
          </MemoryRouter>,
        ),
        "text/html",
      )
    }

    it("should render Umami script when VITE_UMAMI_WEBSITE_ID is set", { timeout: 30000 }, async () => {
      ENV.VITE_UMAMI_WEBSITE_ID = "test-website-id-123"
      ENV.VITE_UMAMI_URL = "https://umami.example.com"

      const document = await renderLayout("/eventos")

      const umamiScript = document.querySelector(
        'script[data-website-id="test-website-id-123"]',
      )
      expect(umamiScript).not.toBeNull()
      expect(umamiScript?.getAttribute("src")).toBe(
        "https://umami.example.com/script.js",
      )
      expect(umamiScript?.hasAttribute("defer")).toBe(true)
    })

    it("hands Umami the hook that refuses to send from admin pages", { timeout: 15000 }, async () => {
      ENV.VITE_UMAMI_WEBSITE_ID = "test-website-id-123"
      ENV.VITE_UMAMI_URL = "https://umami.example.com"

      const document = await renderLayout("/eventos")
      const scripts = Array.from(document.querySelectorAll("head script"))
      const umamiAt = scripts.findIndex((script) =>
        script.hasAttribute("data-website-id"),
      )
      const hookAt = scripts.findIndex((script) =>
        script.textContent?.includes("window.umamiBeforeSend"),
      )

      expect(scripts[umamiAt]?.getAttribute("data-before-send")).toBe(
        "umamiBeforeSend",
      )
      expect(hookAt).toBeGreaterThanOrEqual(0)
      expect(hookAt).toBeLessThan(umamiAt)
    })

    it("should not render Umami script when VITE_UMAMI_WEBSITE_ID is not set", { timeout: 15000 }, async () => {
      ENV.VITE_UMAMI_WEBSITE_ID = ""
      ENV.VITE_UMAMI_URL = ""

      const document = await renderLayout("/eventos")

      const umamiScript = document.querySelector("script[data-website-id]")
      expect(umamiScript).toBeNull()
    })

    it.each(["/admin", "/admin/eventos/123"])(
      "does not render Umami script on the admin page %s",
      { timeout: 15000 },
      async (path) => {
        ENV.VITE_UMAMI_WEBSITE_ID = "test-website-id-123"
        ENV.VITE_UMAMI_URL = "https://umami.example.com"

        const document = await renderLayout(path)

        expect(document.querySelector("script[data-website-id]")).toBeNull()
      },
    )

    it("renders Umami script on a page whose path only starts like admin", { timeout: 15000 }, async () => {
      ENV.VITE_UMAMI_WEBSITE_ID = "test-website-id-123"
      ENV.VITE_UMAMI_URL = "https://umami.example.com"

      const document = await renderLayout("/administracao-de-eventos")

      expect(document.querySelector("script[data-website-id]")).not.toBeNull()
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

describe("App live Site Settings", () => {
  const snapshot = {
    initial: { data: null },
    query: "the-snapshot-query",
    params: {},
    clientConfig: {
      projectId: "8ojkallk",
      dataset: "development",
      apiVersion: "2026-09-24",
    },
  }
  const loaderBase = { siteSettings: { navigation: [{ label: "LOADER" }] } }

  async function renderLive(options: {
    liveSnapshot: unknown
    report: boolean
    value?: unknown
  }) {
    liveControl.report = options.report
    liveControl.value = options.value
    vi.resetModules()
    const { default: App } = await import("./root")
    const result = renderWithRouter(
      <App
        {...({
          loaderData: {
            draftMode: true,
            liveSnapshot: options.liveSnapshot,
            ...loaderBase,
          },
        } as Route.ComponentProps)}
      />,
    )
    return { App, result }
  }

  it("swaps in the live Site Settings reported through onSiteSettings", { timeout: 15000 }, async () => {
    await renderLive({
      liveSnapshot: snapshot,
      report: true,
      value: { navigation: [{ label: "LIVE" }] },
    })

    expect(await screen.findByText("LIVE")).toBeInTheDocument()
  })

  it("shows the loader Site Settings until a live value arrives", { timeout: 15000 }, async () => {
    await renderLive({ liveSnapshot: snapshot, report: false })

    expect(await screen.findByText("LOADER")).toBeInTheDocument()
  })

  it("treats a live empty document as blank chrome, distinct from no value yet", { timeout: 15000 }, async () => {
    await renderLive({ liveSnapshot: snapshot, report: true, value: null })

    expect(await screen.findByText("NONE")).toBeInTheDocument()
  })

  it("reverts to the loader Site Settings when the live snapshot goes away", { timeout: 15000 }, async () => {
    const { App, result } = await renderLive({
      liveSnapshot: snapshot,
      report: true,
      value: { navigation: [{ label: "LIVE" }] },
    })
    expect(await screen.findByText("LIVE")).toBeInTheDocument()

    result.rerender(
      <App
        {...({
          loaderData: {
            draftMode: true,
            liveSnapshot: undefined,
            ...loaderBase,
          },
        } as Route.ComponentProps)}
      />,
    )

    expect(await screen.findByText("LOADER")).toBeInTheDocument()
  })
})

describe("App email confirmation landing", () => {
  it("reports the landing of a confirmed signup", { timeout: 15000 }, async () => {
    const umamiTrack = vi.fn()
    window.umami = { track: umamiTrack }
    vi.resetModules()
    const { default: App } = await import("./root")
    const { MemoryRouter } = await import("react-router")

    render(
      <App
        {...({
          loaderData: { siteSettings: null },
        } as Route.ComponentProps)}
      />,
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={["/?email-confirmado=1"]}>
            {children}
          </MemoryRouter>
        ),
      },
    )

    await waitFor(() =>
      expect(umamiTrack).toHaveBeenCalledWith("email_confirmed", undefined),
    )
    delete window.umami
  })
})
