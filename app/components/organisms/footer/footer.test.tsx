import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { siteSettingsSchema } from "~/business/cms/site-settings.schema"
import { footerCopy, newsDialogCopy } from "~/copy/layout"
import { siteSettingsDocument } from "~/test/site-settings-documents"
import { renderWithDataRouter, screen, within } from "~/test/test-utils"
import { Footer } from "./footer"

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }))

vi.mock("~/lib/hooks/use-analytics", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}))

const siteSettings = siteSettingsSchema.parse(siteSettingsDocument())

function renderFooter(settings: typeof siteSettings | null) {
  return renderWithDataRouter(
    <Footer isThereAnyNews={false} siteSettings={settings} />,
  )
}

describe("Footer", () => {
  describe("with Site Settings", () => {
    it("renders each link column under its title", () => {
      renderFooter(siteSettings)

      const column = screen.getByRole("list", { name: "A Positiv" })
      expect(
        within(column).getByRole("link", { name: "Início" }),
      ).toHaveAttribute("href", "/")
    })

    it("renders the social links", () => {
      renderFooter(siteSettings)

      expect(
        screen.getByRole("link", { name: new RegExp(footerCopy.instagram) }),
      ).toHaveAttribute("href", "https://instagram.com/positivparty")
    })

    it("renders the text", () => {
      renderFooter(siteSettings)

      expect(
        screen.getByText("© 2025 Positiv. Todos os direitos reservados."),
      ).toBeInTheDocument()
    })

    it("says the site is Open Source, linking to the repository", () => {
      renderFooter(siteSettings)

      expect(screen.getByRole("link", { name: "Open Source" })).toHaveAttribute(
        "href",
        "https://github.com/angelod1as/positiv",
      )
    })

    it("keeps the news dialog", () => {
      renderFooter(siteSettings)

      expect(screen.getByText(newsDialogCopy.trigger)).toBeInTheDocument()
    })

    it("lays out the link columns and the rest as two grid children", () => {
      renderFooter(siteSettings)

      const grid = screen.getByTestId("footer-grid")
      expect(grid.children).toHaveLength(2)

      const [columnsCell, restCell] = grid.children
      expect(
        within(columnsCell as HTMLElement).getByRole("list", {
          name: "A Positiv",
        }),
      ).toBeInTheDocument()
      expect(
        within(restCell as HTMLElement).getByText(
          "© 2025 Positiv. Todos os direitos reservados.",
        ),
      ).toBeInTheDocument()
    })
  })

  describe("without Site Settings", () => {
    it("renders the copyright and Instagram from the code", () => {
      renderFooter(null)

      expect(screen.getByText(footerCopy.copyright)).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: new RegExp(footerCopy.instagram) }),
      ).toHaveAttribute("href", "https://instagram.com/positivparty")
    })

    it("renders no link columns", () => {
      renderFooter(null)

      expect(screen.queryByRole("list")).not.toBeInTheDocument()
    })

    it("still says the site is Open Source", () => {
      renderFooter(null)

      expect(screen.getByRole("link", { name: "Open Source" })).toHaveAttribute(
        "href",
        "https://github.com/angelod1as/positiv",
      )
    })

    it("keeps the news dialog", () => {
      renderFooter(null)

      expect(screen.getByText(newsDialogCopy.trigger)).toBeInTheDocument()
    })

    it("lays out the rest as a single, full-width grid child", () => {
      renderFooter(null)

      const grid = screen.getByTestId("footer-grid")
      expect(grid.children).toHaveLength(1)
      expect(grid.children[0]).toHaveClass("lg:col-span-2")
    })
  })

  describe("click tracking", () => {
    beforeEach(() => {
      mockTrack.mockClear()
    })

    it("records a click on a link column's link", async () => {
      renderFooter(siteSettings)

      await userEvent.click(
        within(screen.getByRole("list", { name: "A Positiv" })).getByRole(
          "link",
          { name: "Início" },
        ),
      )

      expect(mockTrack).toHaveBeenCalledWith("nav_link_clicked", {
        area: "footer",
        label: "Início",
        href: "/",
      })
    })

    it("records a click on the Instagram link", async () => {
      renderFooter(siteSettings)

      const instagram = screen.getByRole("link", {
        name: new RegExp(footerCopy.instagram),
      })
      // jsdom cannot follow the link, and says so loudly.
      instagram.addEventListener("click", (event) => event.preventDefault())
      await userEvent.click(instagram)

      expect(mockTrack).toHaveBeenCalledWith("outbound_link_clicked", {
        destination: "instagram",
        area: "footer",
      })
    })
  })
})
