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
  readonly headerDashboard: Locator
  readonly headerAccount: Locator

  constructor(page: Page) {
    this.page = page
    this.title = this.page.getByRole("heading", {
      name: "evento de gente pelada",
      exact: true,
    })
    this.ctaButton = this.page.getByRole("link", { name: "Entrar e conferir" })
    this.knowMoreButton = this.page.getByRole("link", {
      name: "Entre para saber mais",
    })
    this.participationButtons = this.page.getByRole("link", {
      name: "Participar",
    })
    this.newEventsTitle = this.page.getByRole("heading", {
      name: "Próximos Eventos",
    })
    const header = page.getByRole("banner")
    this.headerLogin = header.getByRole("link", { name: "Entrar" })
    this.headerDashboard = header.getByRole("link", { name: "Dashboard" })
    this.headerAccount = header.getByRole("link", { name: "Conta" })
  }

  async goto() {
    await this.page.goto(routes.root.HOME)
  }

  // Alternative to toHaveUrl
  async assertHomepage() {
    await expect(this.title).toBeVisible()
  }

  async testBasicElements() {
    await expect(this.title).toBeVisible()
    await expect(this.ctaButton).toHaveAttribute("href", /entrar/)
    await expect(this.knowMoreButton).toHaveAttribute("href", /entrar/)
  }

  async testLoggedOut() {
    await expect(this.headerLogin).toBeVisible()
  }

  async testLoggedIn() {
    await expect(this.headerLogin).not.toBeVisible()
    await expect(this.headerAccount).toBeVisible()
    await expect(this.headerDashboard).toBeVisible()
  }

  async goToLogin() {
    await this.headerLogin.click()
    await expect(this.page).toHaveURL(/entrar/)
  }
}
