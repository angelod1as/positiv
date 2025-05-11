import { expect, type Locator, type Page } from "@playwright/test"
import paths from "~/lib/paths"

export class AgreeToTermsPOM {
  readonly page: Page
  readonly title: Locator
  readonly agreeCheckbox: Locator
  readonly generalEmailsCheckbox: Locator
  readonly mktEmailsCheckbox: Locator
  readonly continueButton: Locator
  readonly agreeError: Locator

  constructor(page: Page) {
    this.page = page
    // TODO: correct locators
    page.locator("label")
    this.title = page.getByRole("heading", { name: "Bem vinde à Positiv!" })
    this.agreeCheckbox = page.locator("label", {
      hasText: "Li tudo e estou de acordo!",
    })
    this.generalEmailsCheckbox = page.locator("label", {
      hasText: "Aceito receber e-mails gerais",
    })
    this.mktEmailsCheckbox = page.locator("label", {
      hasText: "Aceito receber e-mails sobre",
    })
    this.continueButton = page.getByRole("button", { name: "Continuar" })
    this.agreeError = page.getByText(
      "Você só pode continuar se estiver de acordo",
    )
  }

  async goto() {
    await this.page.goto(paths.dash.participant.AGREE_TO_TERMS)
  }

  async testBasicElements() {
    await expect(this.title).toBeVisible()
    await expect(this.agreeCheckbox).toBeVisible()
    await expect(this.agreeCheckbox).not.toBeChecked()
    await expect(this.mktEmailsCheckbox).toBeVisible()
    await expect(this.mktEmailsCheckbox).toBeChecked()
    await expect(this.generalEmailsCheckbox).toBeVisible()
    await expect(this.generalEmailsCheckbox).toBeChecked()
    await expect(this.continueButton).toBeVisible()
  }

  async testFormError() {
    await expect(this.agreeCheckbox).not.toBeChecked()
    await this.continueButton.click()
    await expect(this.agreeError).toBeVisible()
  }

  async testAgreeToTerms() {
    await this.agreeCheckbox.click()
    await this.continueButton.click()
    await expect(this.page).toHaveURL(/dados-basicos$/)
  }
}
