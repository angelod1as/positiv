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
      expect(within(column).getByRole("link", { name: "Início" })).toHaveAttribute(
        "href",
        "/",
      )
    })

    it("renders the social links", () => {
      renderFooter(siteSettings)

      expect(
        screen.getByRole("link", { name: new RegExp(footerCopy.instagram) }),
      ).toHaveAttribute("href", "https://instagram.com/positivparty")
    })

    it("renders the text and the Desenvolvimento fields", () => {
      renderFooter(siteSettings)

      expect(
        screen.getByText("© 2025 Positiv. Todos os direitos reservados."),
      ).toBeInTheDocument()
      expect(screen.getByText("Feito com carinho.")).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: new RegExp(footerCopy.repository) }),
      ).toHaveAttribute("href", "https://github.com/angelod1as/positiv")
      expect(
        screen.getByRole("link", { name: "Clique aqui e nos avise" }),
      ).toHaveAttribute("href", "https://forms.gle/ys6W6W54YTcoBHrJA")
    })

    it("keeps the news dialog", () => {
      renderFooter(siteSettings)

      expect(screen.getByText(newsDialogCopy.trigger)).toBeInTheDocument()
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

    it("renders nothing an Editor wrote", () => {
      renderFooter(null)

      expect(screen.queryByRole("list")).not.toBeInTheDocument()
      expect(
        screen.queryByRole("link", { name: new RegExp(footerCopy.repository) }),
      ).not.toBeInTheDocument()
    })

    it("keeps the news dialog", () => {
      renderFooter(null)

      expect(screen.getByText(newsDialogCopy.trigger)).toBeInTheDocument()
    })
  })
})
