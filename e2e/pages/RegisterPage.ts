import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class RegisterPage extends BasePage {

  // Page URL
  private readonly url = '/registrar'

  // Locators
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly over18Checkbox: Locator
  readonly submitButton: Locator
  readonly generalErrorAlert: Locator
  readonly emailError: Locator
  readonly passwordError: Locator
  readonly confirmPasswordError: Locator
  readonly over18Error: Locator
  readonly captchaError: Locator
  readonly turnstileIframe: Locator
  readonly loginLink: Locator
  readonly successMessage: Locator

  constructor(page: Page) {
    super(page)

    // Initialize locators
    this.emailInput = page.getByRole('textbox', { name: 'E-mail' })
    this.passwordInput = page.getByLabel('Senha', { exact: true })
    this.confirmPasswordInput = page.getByLabel('Confirme a senha')
    this.over18Checkbox = page.getByRole('checkbox', { name: 'Sou maior de 18 anos' })
    this.submitButton = page.getByRole('button', { name: 'Continuar' })

    // Error locators - use last() to get the actual error message, not the label
    // General error is for server errors, not field validation
    this.generalErrorAlert = page.getByRole('alert').filter({
      hasText: /erro|error|ops|já cadastrado|already registered/i
    })
    this.emailError = page.locator('#errors-for-email').last()
    this.passwordError = page.locator('#errors-for-password').last()
    this.confirmPasswordError = page.locator('#errors-for-confirmPassword').last()
    this.over18Error = page.locator('#errors-for-over18').last()
    this.captchaError = page.locator('#errors-for-captchaToken').last()

    // Turnstile iframe (Cloudflare captcha)
    this.turnstileIframe = page.locator('iframe[src*="challenges.cloudflare.com"]')

    // Navigation
    this.loginLink = page.getByRole('link', { name: 'Entre aqui' })

    // Success message (if displayed on page)
    this.successMessage = page.getByText('Você precisa confirmar sua conta, veja seu e-mail!')
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    // Wait for DOM to be ready, then wait for form element instead of networkidle
    // networkidle is flaky in CI environments
    await this.page.waitForLoadState('domcontentloaded')
    // Wait for form to be ready (more reliable than networkidle)
    await this.emailInput.waitFor({ state: 'visible', timeout: 30000 })
  }

  async fillRegistrationForm(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(confirmPassword || password)
    // Use force click if the checkbox has a label overlay
    await this.over18Checkbox.check({ force: true })

    // Wait for Turnstile to auto-complete (test keys auto-pass in localhost)
    await this.waitForTurnstileCompletion()
  }

  async waitForTurnstileCompletion(): Promise<void> {
    try {
      // Wait for the Turnstile iframe to appear (may not load in CI)
      await this.page.waitForSelector('iframe[src*="challenges.cloudflare.com"]', {
        state: 'attached',
        timeout: 5000
      })
      // With test keys, Turnstile auto-completes. Wait a moment for the token to be set
      await this.page.waitForTimeout(1000)
    } catch {
      // Turnstile may not load in CI environments - inject mock token
      // Supabase captcha is disabled locally (config.toml), so any token works
      await this.injectMockCaptchaToken()
    }
  }

  private async injectMockCaptchaToken(): Promise<void> {
    // Use Playwright's fill method on the hidden input - this properly triggers React events
    const captchaInput = this.page.locator('input[name="captchaToken"]')
    await captchaInput.fill('e2e-mock-captcha-token-12345', { force: true })
    // Brief wait for form state to update
    await this.page.waitForTimeout(200)
  }

  async register(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.goto()
    await this.fillRegistrationForm(email, password, confirmPassword)
    await this.submitButton.click()
  }

  async verifyRegistrationPageDisplayed(): Promise<void> {
    await expect(this.page.getByText('Inscreva-se')).toBeVisible()
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.confirmPasswordInput).toBeVisible()
    await expect(this.over18Checkbox).toBeVisible()
    await expect(this.submitButton).toBeVisible()
  }

  async verifyFormErrors(): Promise<void> {
    // This will verify all required field errors are shown
    await expect(this.emailError).toBeVisible()
    await expect(this.passwordError).toBeVisible()
    await expect(this.confirmPasswordError).toBeVisible()
    await expect(this.over18Error).toBeVisible()
  }

  async waitForSuccessRedirect(): Promise<void> {
    // Wait for redirect to confirm email message page
    // Use domcontentloaded instead of networkidle for CI reliability
    await this.page.waitForURL('/registrar/confirmar-email', { waitUntil: 'domcontentloaded' })
  }

  async verifyConfirmEmailPageDisplayed(): Promise<void> {
    await expect(this.page.getByText('Confirme sua conta')).toBeVisible()
    await expect(this.page.getByText(/clique no link na mensagem enviada para seu email/i)).toBeVisible()
  }
}