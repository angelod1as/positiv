import { expect, type Locator, type Page } from "@playwright/test"
import paths from "~/lib/paths"

export class GenderPronounOrientationPOM {
  readonly page: Page
  readonly gender1Checkbox: Locator
  readonly orientation1Checkbox: Locator
  readonly orientation2Checkbox: Locator
  readonly pronouns1Checkbox: Locator
  readonly othersCheckbox: Locator
  readonly otherInput: Locator
  readonly confirmButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page

    this.gender1Checkbox = page
      .locator("label")
      .filter({ hasText: "Mulher trans" })
      .getByTestId("checkbox")
    this.orientation1Checkbox = page
      .locator("label")
      .filter({ hasText: "Demi" })
      .getByTestId("checkbox")
    this.orientation2Checkbox = page
      .locator("label")
      .filter({ hasText: "Pan" })
      .getByTestId("checkbox")
    this.pronouns1Checkbox = page
      .locator("label")
      .filter({ hasText: "Ele/dele" })
      .getByTestId("checkbox")
    this.othersCheckbox = page
      .locator("label")
      .filter({ hasText: "Outros" })
      .first()
    this.otherInput = page.getByTestId("outros-gender")
    this.confirmButton = page.getByRole("button", { name: "Continuar" })
    this.errorMessage = page
      .getByText("Você precisa escolher pelo menos um")
      .first()
  }

  async goto() {
    await this.page.goto(paths.dash.account.BASIC_DATA)
  }

  async testError() {
    await this.confirmButton.click()
    await expect(this.errorMessage).toBeVisible()
  }

  async testFillBasicData() {
    await this.gender1Checkbox.click()
    await this.orientation1Checkbox.click()
    await this.orientation2Checkbox.click()
    await this.pronouns1Checkbox.click()
    await this.othersCheckbox.click()
    await this.otherInput.fill("This, That")
    await this.confirmButton.click()
    await expect(this.page).toHaveURL(/dashboard$/)
  }

  async checkPrefilledBasicData() {}
}
