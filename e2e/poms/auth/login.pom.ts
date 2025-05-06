import { expect, type Locator, type Page } from "@playwright/test"
import paths from "~/lib/paths"

export class LoginPOM {
  readonly page: Page
  readonly emailInput: Locator
  readonly emailError: Locator
  readonly passwordInput: Locator
  readonly passwordError: Locator
  readonly submitButton: Locator
  readonly generalError: Locator

  constructor(page: Page) {
    this.page = page
    // TODO: correct locators
    this.emailInput = page.getByLabel("E-mail")
    this.emailError = page.getByText("Error?")
    this.passwordInput = page.getByLabel("Senha")
    this.passwordError = page.getByText("Error?")
    this.submitButton = page.getByRole("button", { name: "Entrar" }).first()
    this.generalError = page.getByText("Error?")
  }

  async goto() {
    await this.page.goto(paths.auth.LOGIN)
  }

  async testBasicElements() {
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.submitButton).toBeVisible()
  }

  // TODO: correct data from here down
  async testLogin() {
    await this.passwordInput.fill("email")
    await this.passwordInput.fill("password")
    await this.submitButton.click()
    await expect(this.page).toHaveURL(/dashboard/)
  }

  async testInvalidPassword() {
    await this.passwordInput.fill("email")
    await this.passwordInput.fill("INVALID-password")
    await this.submitButton.click()
    await expect(this.passwordError).toBeVisible()
  }

  async testInvalidEmail() {
    await this.passwordInput.fill("INVALID-email")
    await this.passwordInput.fill("password")
    await this.submitButton.click()
    await expect(this.emailError).toBeVisible()
  }

  async testWrongCredentials() {
    await this.passwordInput.fill("WRONG-email")
    await this.passwordInput.fill("WRONG-password")
    await this.submitButton.click()
    await expect(this.emailError).toBeVisible()
  }
}
