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
    
    // Navigation
    this.loginLink = page.getByRole('link', { name: 'Entre aqui' })
    
    // Success message (if displayed on page)
    this.successMessage = page.getByText('Você precisa confirmar sua conta, veja seu e-mail!')
  }
  
  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('networkidle')
    // Wait for form to be ready
    await this.emailInput.waitFor({ state: 'visible' })
  }
  
  async fillRegistrationForm(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(confirmPassword || password)
    // Use force click if the checkbox has a label overlay
    await this.over18Checkbox.check({ force: true })
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
    // Wait for redirect to homepage with success message
    await this.page.waitForURL('/', { waitUntil: 'networkidle' })
  }
}