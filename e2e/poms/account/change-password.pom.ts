import { expect, type Locator, type Page } from "@playwright/test"
import paths from "~/lib/paths"

export class ChangePasswordPOM {
  readonly page: Page
  readonly title: Locator
  readonly newPassword: Locator
  readonly newPasswordError: Locator
  readonly confirmPassword: Locator
  readonly confirmPasswordError: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    this.page = page

    this.title = page.getByRole("heading", { name: "Mudar senha", exact: true })
    this.newPassword = page.getByRole("textbox", { name: "Nova senha" })
    this.confirmPassword = page.getByRole("textbox", {
      name: "Confirmar senha",
    })
    this.newPasswordError = page.getByText(
      "A senha precisa ter, no mínimo, 6 caracteres",
    )
    this.confirmPasswordError = page.getByText("As senhas não combinam")
    this.submitButton = page.getByRole("button", { name: "Mudar senha" })
  }

  async goto() {
    await this.page.goto(paths.dash.account.CHANGE_PASSWORD)
  }

  async testErrors() {
    await expect(this.title).toBeVisible()
    this.submitButton.click()
    expect(this.newPasswordError).toBeVisible()

    this.newPassword.fill("123546")
    this.submitButton.click()
    expect(this.confirmPasswordError).toBeVisible()
  }

  async testChangePassword(password: string) {
    await expect(this.title).toBeVisible()

    await this.newPassword.fill(password)
    await this.confirmPassword.fill(password)

    await this.submitButton.click()

    await expect(this.newPasswordError).not.toBeVisible()
    await expect(this.confirmPasswordError).not.toBeVisible()
    await expect(this.page).toHaveURL(/conta$/)
  }
}
