import { expect, type Locator, type Page } from "@playwright/test"
import { createMockCredentials } from "e2e/helpers/create-mock-credentials"
import { createMockUser } from "e2e/setup/create-mock-user"
import paths from "~/lib/paths"

export class LoginPOM {
  readonly page: Page
  readonly emailInput: Locator
  readonly emailError: Locator
  readonly passwordInput: Locator
  readonly passwordError: Locator
  readonly submitButton: Locator
  readonly generalError: Locator
  readonly headerLoginButton: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByRole("textbox", { name: "E-mail" })
    this.emailError = page
      .locator("#errors-for-email")
      .filter({ hasText: "Insira pelo menos um caracter" })
    this.passwordInput = page.getByRole("textbox", { name: "Senha" })
    this.passwordError = page
      .locator("#errors-for-password")
      .filter({ hasText: "Insira pelo menos um caracter" })
    this.submitButton = page.getByRole("button", { name: "Entrar" })
    this.generalError = page
      .getByRole("alert")
      .filter({ hasText: "Credenciais inválidas" })
    this.headerLoginButton = page
      .getByRole("banner")
      .getByRole("link", { name: "Entrar" })
  }

  async goto() {
    await this.page.goto(paths.auth.LOGIN)
  }

  async testBasicElements() {
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.submitButton).toBeVisible()
    await expect(this.headerLoginButton).not.toBeVisible()
  }

  async testInvalidPassword() {
    await this.emailInput.fill("valid@email.com")
    await this.submitButton.click()
    await expect(this.passwordError).toBeVisible()
  }

  /*
    Invalid email is not tested because the browser takes care of it
  */

  async testWrongCredentials() {
    await this.passwordInput.fill("WRONG-email")
    await this.passwordInput.fill("WRONG-password")
    await this.submitButton.click()
    await expect(this.generalError).toBeVisible()
  }

  async doStraightLogin(
    email: string,
    password: string,
    filled: boolean = false,
  ) {
    await this.page.waitForLoadState("domcontentloaded")
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
    if (filled) {
      await this.page.waitForURL(/dashboard$/)
      await expect(this.page).toHaveURL(/dashboard$/)
    } else {
      await this.page.waitForURL(/termos$/)
      await expect(this.page).toHaveURL(/termos$/)
    }
  }

  async doLogin() {
    const { email, password } = createMockCredentials()
    await createMockUser(email, password, { admin: false })
    this.doStraightLogin(email, password)
    return { email, password }
  }
}
