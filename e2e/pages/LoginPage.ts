import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  
  // Page URL
  private readonly url = '/entrar'
  
  // Locators
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly generalErrorAlert: Locator
  readonly emailError: Locator
  readonly passwordError: Locator
  readonly userAvatar: Locator
  readonly headerLoginButton: Locator
  
  constructor(page: Page) {
    super(page)
    
    // Initialize locators
    this.emailInput = page.getByRole('textbox', { name: 'E-mail' })
    this.passwordInput = page.getByLabel('Senha')
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
  
  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }
  
  async login(email: string, password: string): Promise<void> {
    await this.goto()
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    
    // Submit and wait for navigation
    await Promise.all([
      this.page.waitForURL(url => {
        const pathname = new URL(url).pathname
        return pathname === '/dashboard' || pathname === '/conta/termos-e-condicoes'
      }),
      this.submitButton.click()
    ])
  }
  
  async verifyLoginPageDisplayed(): Promise<void> {
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.submitButton).toBeVisible()
    await expect(this.headerLoginButton).not.toBeVisible()
  }
  
  async isLoggedIn(): Promise<boolean> {
    // Check if we're on a protected page
    const currentUrl = this.page.url()
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/conta')) {
      return true
    }
    
    // Check for user avatar in header
    try {
      await this.userAvatar.waitFor({ state: 'visible', timeout: 2000 })
      return true
    } catch {
      // Not visible, check localStorage
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