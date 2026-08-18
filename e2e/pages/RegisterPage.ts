import { expect, type Locator, type Page } from '@playwright/test'
import { BasePage } from './BasePage'

/** Local Supabase runs with captcha verification disabled, so any token passes. */
const MOCK_CAPTCHA_TOKEN = 'e2e-mock-captcha-token-12345'

export class RegisterPage extends BasePage {

  // Page URL
  private readonly url = '/registrar'

  // Locators
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly over18Checkbox: Locator
  readonly submitButton: Locator
  readonly captchaTokenInput: Locator
  readonly turnstileIframe: Locator
  readonly loginLink: Locator

  // Errors. The runtime draws each message as an alert beside its own field,
  // so they are found by what they say rather than by a generated id.
  readonly confirmPasswordError: Locator
  readonly over18Error: Locator
  readonly emailFormatError: Locator
  readonly claimedProfileError: Locator
  readonly commitFailureError: Locator
  readonly anyAlreadyRegisteredWording: Locator

  constructor(page: Page) {
    super(page)

    this.emailInput = page.getByLabel('E-mail')
    this.passwordInput = page.getByLabel('Senha', { exact: true })
    this.confirmPasswordInput = page.getByLabel('Confirme a senha')
    this.over18Checkbox = page.getByRole('checkbox', { name: 'Sou maior de 18 anos' })
    this.submitButton = page.getByRole('button', { name: 'Continuar' })
    this.captchaTokenInput = page.locator('input[name="captchaToken"]')
    this.turnstileIframe = page.locator('iframe[src*="challenges.cloudflare.com"]')
    this.loginLink = page.getByRole('link', { name: 'Entre aqui' })

    this.confirmPasswordError = page.getByText('As senhas não são iguais')
    this.over18Error = page.getByText('Você só pode se inscrever se for maior de 18 anos')
    this.emailFormatError = page.getByRole('alert').filter({ hasText: /e-?mail/i })
    this.claimedProfileError = page.getByText(/Houve um erro no cadastro da sua conta/i)
    this.commitFailureError = page.getByText('Não foi possível salvar agora. Tente novamente.')

    // Nothing on this page may ever say that an address is taken. Kept as a
    // locator so a test can assert its absence.
    this.anyAlreadyRegisteredWording = page.getByText(
      /já (est[áa] )?cadastrad|already registered|conta j[áa] existe/i,
    )
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
    // The form is client-rendered, so the field arriving is what says the page
    // is ready — more reliable than networkidle in CI.
    await this.emailInput.waitFor({ state: 'visible', timeout: 30000 })
  }

  /**
   * Makes sure the runtime is holding a captcha token before the form is sent.
   *
   * The widget is preferred — with the test site key it answers on its own, and
   * letting it do so is what keeps this honest. But it depends on reaching
   * Cloudflare, which a CI run may not, so a token is handed over directly when
   * the widget has produced none in time. Either way it reaches React state
   * through the mirror input the page renders for exactly this.
   */
  async provideCaptchaToken(token: string = MOCK_CAPTCHA_TOKEN): Promise<void> {
    await this.captchaTokenInput.waitFor({ state: 'attached', timeout: 30000 })

    try {
      await expect(this.captchaTokenInput).not.toHaveValue('', { timeout: 5000 })
      return
    } catch {
      console.warn('Turnstile produced no token in time; handing one over directly.')
    }

    await this.setCaptchaToken(token)
  }

  /**
   * Writes into the mirror the way a person types: through the native value
   * setter plus an input event, which is what React listens for. `fill()` would
   * refuse an element hidden from view.
   */
  async setCaptchaToken(token: string = MOCK_CAPTCHA_TOKEN): Promise<void> {
    await this.captchaTokenInput.evaluate((element, value) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set

      setter?.call(element, value)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    }, token)

    await expect(this.captchaTokenInput).toHaveValue(token)
  }

  /**
   * The widget can expire or error after answering, and either wipes the token.
   * Asserted right before sending, so a submit is never made with one that
   * quietly went away.
   */
  async verifyCaptchaTokenIsHeld(): Promise<void> {
    await expect(this.captchaTokenInput).not.toHaveValue('')
  }

  async fillRegistrationForm(
    email: string,
    password: string,
    confirmPassword?: string,
    { captcha = 'widget' }: { captcha?: 'widget' | 'direct' } = {},
  ): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(confirmPassword ?? password)
    // The visible box is a styled span over a screen-reader-only input.
    await this.over18Checkbox.check({ force: true })

    if (captcha === 'direct') {
      await this.setCaptchaToken()
    } else {
      await this.provideCaptchaToken()
    }

    await this.verifyCaptchaTokenIsHeld()
  }

  async register(
    email: string,
    password: string,
    confirmPassword?: string,
    options: { captcha?: 'widget' | 'direct' } = {},
  ): Promise<void> {
    await this.goto()
    await this.fillRegistrationForm(email, password, confirmPassword, options)
    await this.submitButton.click()
  }

  async verifyRegistrationPageDisplayed(): Promise<void> {
    await expect(this.page.getByText('Criar conta', { exact: true })).toBeVisible()
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.confirmPasswordInput).toBeVisible()
    await expect(this.over18Checkbox).toBeVisible()
    await expect(this.submitButton).toBeVisible()
  }

  async verifyPasswordsAreMasked(): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('type', 'password')
    await expect(this.confirmPasswordInput).toHaveAttribute('type', 'password')
  }

  async waitForSuccessRedirect(): Promise<void> {
    await this.page.waitForURL('/registrar/confirmar-email', {
      waitUntil: 'domcontentloaded',
    })
  }

  async verifyConfirmEmailPageDisplayed(): Promise<void> {
    await expect(this.page.getByText('Confirme sua conta')).toBeVisible()
    await expect(
      this.page.getByText(/clique no link na mensagem enviada para seu email/i),
    ).toBeVisible()
  }

  /** Nothing anywhere on the page may reveal that an address already has an account. */
  async verifyNothingRevealsAnExistingAccount(): Promise<void> {
    await expect(this.anyAlreadyRegisteredWording).toHaveCount(0)
  }
}
