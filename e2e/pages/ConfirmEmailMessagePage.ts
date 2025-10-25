import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class ConfirmEmailMessagePage extends BasePage {

  // Page URL
  private readonly url = '/registrar/confirmar-email'

  // Locators
  readonly pageTitle: Locator
  readonly confirmMessage: Locator
  readonly spamWarning: Locator
  readonly homeButton: Locator
  readonly forgotPasswordLink: Locator
  readonly delayMessage: Locator

  constructor(page: Page) {
    super(page)

    // Initialize locators
    this.pageTitle = page.getByRole('heading', { name: 'Confirme sua conta' })
    this.confirmMessage = page.getByText(/clique no link na mensagem enviada para seu email/i)
    this.spamWarning = page.getByText(/não esqueça de checar a caixa de spam/i)
    this.homeButton = page.getByRole('link', { name: 'Voltar para a home' })
    this.forgotPasswordLink = page.getByRole('link', { name: /esqueci minha senha/i })
    this.delayMessage = page.getByText(/se a mensagem demorar mais que 5 minutos/i)
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('networkidle')
    await this.pageTitle.waitFor({ state: 'visible' })
  }

  async verifyPageDisplayed(): Promise<void> {
    await expect(this.pageTitle).toBeVisible()
    await expect(this.confirmMessage).toBeVisible()
    await expect(this.spamWarning).toBeVisible()
    await expect(this.homeButton).toBeVisible()
    await expect(this.forgotPasswordLink).toBeVisible()
    await expect(this.delayMessage).toBeVisible()
  }

  async goToHome(): Promise<void> {
    await this.clickAndWait(this.homeButton, { waitForNavigation: true })
  }

  async goToForgotPassword(): Promise<void> {
    await this.clickAndWait(this.forgotPasswordLink, { waitForNavigation: true })
  }
}