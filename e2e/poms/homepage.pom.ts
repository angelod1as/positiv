import { expect, type Locator, type Page } from "@playwright/test"
import routes from "~/lib/routes"

export class HomepagePOM {
  readonly page: Page
  readonly title: Locator
  readonly cta: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByRole("heading", {
      name: "evento de gente pelada",
      exact: true,
    })
    this.cta = page.getByRole("link", { name: "Entrar" })
  }

  async goto() {
    await this.page.goto(routes.root.HOME)
  }

  async basicElements() {
    await expect(this.title).toBeVisible()
    await expect(this.cta).toHaveAttribute("href", /entrar/)
  }
}
