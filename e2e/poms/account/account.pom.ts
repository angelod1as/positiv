import { expect, type Locator, type Page } from "@playwright/test"
import paths from "~/lib/paths"

export class AccountPOM {
  readonly page: Page
  readonly editBasicDataButton: Locator
  readonly fillBasicDataButton: Locator
  readonly changePasswordButton: Locator
  readonly logoutButton: Locator
  readonly deleteAccountButton: Locator

  constructor(page: Page) {
    this.page = page
    // TODO: correct locators
    this.editBasicDataButton = page.getByRole("link", {
      name: "Editar dados básicos",
    })
    this.fillBasicDataButton = page.getByRole("link", {
      name: "Preencher dados básicos",
    })
    this.changePasswordButton = page.getByRole("link", { name: "Mudar senha" })
    this.logoutButton = page.getByRole("button", { name: "Deslogar conta" })
    this.deleteAccountButton = page.getByRole("button", {
      name: "Apagar conta",
    })
  }

  async goto() {
    await this.page.goto(paths.dash.account.ACCOUNT)
  }

  async goToChangePassword() {
    await this.changePasswordButton.click()
    await expect(this.page).toHaveURL(/mudar-senha$/)
  }

  async logout() {
    await this.logoutButton.click()
    await expect(this.page).toHaveURL(/entrar$/)
  }
}
