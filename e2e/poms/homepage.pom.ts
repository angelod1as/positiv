import { expect, type Locator, type Page } from "@playwright/test"
import routes from "~/lib/paths"

export class HomepagePOM {
  readonly page: Page
  readonly title: Locator
  readonly ctaButton: Locator
  readonly participationButtons: Locator
  readonly knowMoreButton: Locator
  readonly newEventsTitle: Locator
  readonly headerLogin: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByRole("heading", {
      name: "evento de gente pelada",
      exact: true,
    })
    this.ctaButton = page.getByRole("link", { name: "Entrar e conferir" })
    this.knowMoreButton = page.getByRole("link", {
      name: "Entre para saber mais",
    })
    this.participationButtons = page.getByRole("link", { name: "Participar" })
    this.newEventsTitle = page.getByRole("heading", {
      name: "Próximos Eventos",
    })
    this.headerLogin = page
      .getByRole("banner")
      .getByRole("link", { name: "Entrar" })
  }

  async goto() {
    await this.page.goto(routes.root.HOME)
  }

  // Alternative to toHaveUrl
  async assertHomepage() {
    await expect(this.title).toBeVisible()
  }

  async testBasicElements() {
    await this.goto()
    await expect(this.title).toBeVisible()
    await expect(this.ctaButton).toHaveAttribute("href", /entrar/)
    await expect(this.knowMoreButton).toHaveAttribute("href", /entrar/)
  }

  async testLoggedOut() {
    await this.goto()
    await expect(this.headerLogin).toBeVisible()
    await expect(this.participationButtons).toHaveCount(3)
    await expect(this.participationButtons.first()).toHaveAttribute(
      "href",
      /entrar/,
    )
  }

  async goToLogin() {
    await this.goto()
    await this.headerLogin.click()
    await expect(this.page).toHaveURL(/entrar/)
  }
}
