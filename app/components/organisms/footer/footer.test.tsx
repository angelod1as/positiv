import { describe, expect, it } from "vitest"
import { siteSettingsSchema } from "~/business/cms/site-settings.schema"
import { footerCopy, newsDialogCopy } from "~/copy/layout"
import { siteSettingsDocument } from "~/test/site-settings-documents"
import { renderWithDataRouter, screen, within } from "~/test/test-utils"
import { Footer } from "./footer"

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

      expect(screen.getByTestId("footer-grid").children).toHaveLength(2)
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

    it("lays out the rest as a single grid child", () => {
      renderFooter(null)

      expect(screen.getByTestId("footer-grid").children).toHaveLength(1)
    })
  })
})
