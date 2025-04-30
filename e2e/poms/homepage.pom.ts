import { expect, type Locator, type Page } from "@playwright/test"
import routes from "~/lib/paths"

export class HomepagePOM {
  readonly page: Page
  readonly title: Locator
  readonly ctaButton: Locator
  readonly participationButton: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByRole("heading", {
      name: "evento de gente pelada",
      exact: true,
    })
    this.ctaButton = page.getByRole("link", { name: "Entrar" })
    this.participationButton = page
      .getByRole("link", { name: "Participar" })
      .first()
  }

  async goto() {
    await this.page.goto(routes.root.HOME)
  }

  async basicElements() {
    await expect(this.title).toBeVisible()
    await expect(this.ctaButton).toHaveAttribute("href", /entrar/)
    await expect(this.participationButton).toHaveAttribute("href", /entrar/)
  }
}
