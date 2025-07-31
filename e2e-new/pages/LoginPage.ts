import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  // Page URL
  private readonly url = '/entrar'
  
  // Locators
  private readonly emailInput: Locator
  private readonly passwordInput: Locator
  private readonly submitButton: Locator
  private readonly generalErrorAlert: Locator
  private readonly emailError: Locator
  private readonly passwordError: Locator
  private readonly userAvatar: Locator
  private readonly headerLoginButton: Locator
  
  constructor(page: Page) {
    super(page)
    
    // Initialize locators
    this.emailInput = page.getByRole('textbox', { name: 'E-mail' })
    this.passwordInput = page.getByRole('textbox', { name: 'Senha' })
    this.submitButton = page.getByRole('button', { name: 'Entrar' })
    
    // Error locators
    this.generalErrorAlert = page.getByRole('alert').filter({ hasText: 'Credenciais inválidas' })
    this.emailError = page.locator('#errors-for-email').filter({ hasText: 'Insira pelo menos um caracter' })
    this.passwordError = page.locator('#errors-for-password').filter({ hasText: 'Insira pelo menos um caracter' })
    
    // User state indicators
    this.userAvatar = page.locator('[data-testid="user-avatar"]').or(
      page.getByRole('button', { name: /menu do usuário/i })
    )
    
    this.headerLoginButton = page.getByRole('banner').getByRole('link', { name: 'Entrar' })
  }
  
  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await this.navigateTo(this.url)
  }
  
  /**
   * Fill login form with email and password
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.fillAndVerify(this.emailInput, email)
    await this.fillAndVerify(this.passwordInput, password)
  }
  
  /**
   * Submit the login form
   */
  async submitForm(): Promise<void> {
    await this.clickAndWait(this.submitButton, { 
      waitForNavigation: true 
    })
  }
  
  /**
   * Perform login and wait for expected redirect
   */
  async login(email: string, password: string, options?: {
    expectUrl?: string | RegExp
    timeout?: number
  }): Promise<void> {
    const { expectUrl = /dashboard|termos-e-condicoes/, timeout = 30000 } = options || {}
    
    await this.goto()
    await this.fillLoginForm(email, password)
    
    // Submit and wait for navigation
    await Promise.all([
      this.page.waitForURL(expectUrl, { timeout }),
      this.submitForm()
    ])
    
    // Wait for page to stabilize
    await this.waitForPageLoad()
  }
  
  /**
   * Login expecting to land on dashboard (already onboarded users)
   */
  async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.login(email, password, { expectUrl: /dashboard$/ })
    await expect(this.page).toHaveURL(/dashboard$/)
  }
  
  /**
   * Login expecting to land on terms page (new users)
   */
  async loginAndWaitForTerms(email: string, password: string): Promise<void> {
    await this.login(email, password, { expectUrl: /termos-e-condicoes$/ })
    await expect(this.page).toHaveURL(/termos-e-condicoes$/)
  }
  
  /**
   * Check if user is currently logged in
   */
  async isLoggedIn(): Promise<boolean> {
    // Check if we're on a protected page
    const currentUrl = this.page.url()
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/conta')) {
      return true
    }
    
    // Check for user avatar in header
    const avatarVisible = await this.elementExists(this.userAvatar, { timeout: 2000 })
    if (avatarVisible) {
      return true
    }
    
    // Check localStorage for auth token
    const hasAuthToken = await this.page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') && key.includes('auth')
      )
      
      for (const key of keys) {
        try {
          const storage = localStorage.getItem(key)
          if (storage) {
            const parsed = JSON.parse(storage)
            if (parsed?.currentSession?.user || parsed?.user) {
              return true
            }
          }
        } catch {
          // Continue checking other keys
        }
      }
      
      return false
    })
    
    return hasAuthToken
  }
  
  /**
   * Get the general error message (invalid credentials)
   */
  async getGeneralErrorMessage(): Promise<string | null> {
    if (await this.elementExists(this.generalErrorAlert)) {
      return await this.getTextContent(this.generalErrorAlert)
    }
    return null
  }
  
  /**
   * Get the email field error message
   */
  async getEmailErrorMessage(): Promise<string | null> {
    if (await this.elementExists(this.emailError)) {
      return await this.getTextContent(this.emailError)
    }
    return null
  }
  
  /**
   * Get the password field error message
   */
  async getPasswordErrorMessage(): Promise<string | null> {
    if (await this.elementExists(this.passwordError)) {
      return await this.getTextContent(this.passwordError)
    }
    return null
  }
  
  /**
   * Verify login page is displayed with all elements
   */
  async verifyLoginPageDisplayed(): Promise<void> {
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.submitButton).toBeVisible()
    
    // Header login button should not be visible on login page
    await expect(this.headerLoginButton).not.toBeVisible()
  }
  
  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear()
    await this.passwordInput.clear()
  }
  
  /**
   * Submit form without filling (to test validation)
   */
  async submitEmptyForm(): Promise<void> {
    await this.clickAndWait(this.submitButton, { waitForNavigation: false })
  }
  
  /**
   * Fill only email and submit (to test password validation)
   */
  async submitWithEmailOnly(email: string): Promise<void> {
    await this.fillAndVerify(this.emailInput, email)
    await this.clickAndWait(this.submitButton, { waitForNavigation: false })
  }
  
  /**
   * Get current user email from localStorage
   */
  async getCurrentUserEmail(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') && key.includes('auth')
      )
      
      for (const key of keys) {
        try {
          const storage = localStorage.getItem(key)
          if (!storage) continue
          
          const parsed = JSON.parse(storage)
          const email = parsed?.currentSession?.user?.email || 
                       parsed?.user?.email || 
                       parsed?.access_token?.email
          
          if (email) return email
        } catch {
          // Continue to next key
        }
      }
      
      return null
    })
  }
}