import { type Page, expect } from '@playwright/test'
import { TEST_USERS, type TestUserKey, type TestUser } from './test-users'
import { setupUserAsFullyOnboarded } from '../utils/db-cleanup'

const LOGIN_URL = '/entrar'
const DASHBOARD_URL = '/dashboard'
const TERMS_URL = '/conta/termos-e-condicoes'

export async function performUILoginWithPrefilledData(page: Page, email: string, password: string): Promise<void> {
  // Pre-fill user data to skip onboarding forms
  await setupUserAsFullyOnboarded(email)
  
  await page.goto(LOGIN_URL)
  await page.waitForLoadState('networkidle')

  const emailInput = page.getByRole('textbox', { name: 'E-mail' })
  const passwordInput = page.getByRole('textbox', { name: 'Senha' })
  const submitButton = page.getByRole('button', { name: 'Entrar' })

  await emailInput.fill(email)
  await passwordInput.fill(password)
  
  await Promise.all([
    page.waitForNavigation({ 
      url: DASHBOARD_URL,
      waitUntil: 'networkidle' 
    }),
    submitButton.click()
  ])

  await expect(page).toHaveURL(new RegExp(`${DASHBOARD_URL}$`))
  await page.waitForLoadState('networkidle')
}

export async function performUILogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto(LOGIN_URL)
  await page.waitForLoadState('networkidle')

  const emailInput = page.getByRole('textbox', { name: 'E-mail' })
  const passwordInput = page.getByRole('textbox', { name: 'Senha' })
  const submitButton = page.getByRole('button', { name: 'Entrar' })

  await emailInput.fill(email)
  await passwordInput.fill(password)
  
  await Promise.all([
    page.waitForNavigation({ 
      url: url => url.pathname === DASHBOARD_URL || url.pathname === TERMS_URL,
      waitUntil: 'networkidle' 
    }),
    submitButton.click()
  ])

  const currentPath = new URL(page.url()).pathname
  if (currentPath === TERMS_URL) {
    // Need to agree to terms first
    const agreeCheckbox = page.locator('label', { hasText: 'Li tudo e estou de acordo!' })
    await expect(agreeCheckbox).toBeVisible({ timeout: 10000 })
    await agreeCheckbox.click()
    
    const continueButton = page.getByRole('button', { name: 'Continuar' })
    await expect(continueButton).toBeVisible()
    
    await Promise.all([
      page.waitForNavigation({ url: /dados-basicos$/, waitUntil: 'networkidle' }),
      continueButton.click()
    ])
    
    // Fill basic data form - page 1
    await expect(page).toHaveURL(/dados-basicos$/)
    
    // Fill all required fields
    await page.getByRole('textbox', { name: 'Nome completo' }).fill('Test E2E User')
    await page.getByRole('textbox', { name: 'Nome social ou apelido' }).fill('E2E Test')
    await page.getByRole('textbox', { name: 'RG', exact: true }).fill('123456789')
    await page.getByRole('textbox', { name: 'Emissor do RG' }).fill('SSP/SP')
    await page.getByRole('textbox', { name: 'CPF' }).fill('12345678900')
    await page.getByRole('textbox', { name: 'Data de nascimento' }).fill('1990-01-01')
    await page.getByRole('spinbutton', { name: 'Whatsapp', exact: true }).fill('11999999999')
    await page.getByRole('spinbutton', { name: 'Confirme seu whatsapp' }).fill('11999999999')
    await page.getByRole('textbox', { name: 'Como chegou até nós?' }).fill('E2E Tests')
    await page.getByRole('textbox', { name: 'Em que cidade você mora?' }).fill('São Paulo')
    
    const continueBtn = page.getByRole('button', { name: 'Continuar' })
    await Promise.all([
      page.waitForNavigation({ url: /dados-basicos-cont$/, waitUntil: 'networkidle' }),
      continueBtn.click()
    ])
    
    // Fill basic data form - page 2 (gender/pronouns/orientation)
    await expect(page).toHaveURL(/dados-basicos-cont$/)
    await page.waitForLoadState('networkidle')
    
    // Scroll down a bit to avoid header interference
    await page.evaluate(() => window.scrollBy(0, 100))
    await page.waitForTimeout(500)
    
    // Try clicking checkboxes via their labels
    try {
      // Click the first visible checkbox label in each section
      const sections = page.locator('section')
      const sectionCount = await sections.count()
      console.log(`Found ${sectionCount} sections`)
      
      for (let i = 0; i < Math.min(sectionCount, 3); i++) {
        const labels = sections.nth(i).locator('label')
        const labelCount = await labels.count()
        if (labelCount > 0) {
          console.log(`Section ${i} has ${labelCount} labels`)
          // Click the first label in this section
          await labels.first().click({ force: true })
          await page.waitForTimeout(300)
        }
      }
    } catch (error) {
      console.error('Error clicking checkboxes:', error)
      // Fallback: try to click any visible checkbox
      const anyLabel = page.locator('label').first()
      if (await anyLabel.isVisible()) {
        await anyLabel.click({ force: true })
      }
    }
    
    // Try to continue regardless
    const continueButton2 = page.getByRole('button', { name: 'Continuar' })
    await continueButton2.click()
    
    // Wait for navigation - might go to dashboard or show an error
    await page.waitForLoadState('networkidle')
    
    // If we're still on the same page, there might be validation errors
    if (page.url().includes('dados-basicos-cont')) {
      console.log('Still on dados-basicos-cont, checking for errors...')
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/dados-basicos-cont-error.png' })
    }
  }

  await expect(page).toHaveURL(new RegExp(`${DASHBOARD_URL}$`))
  await page.waitForLoadState('networkidle')
}

export async function loginAsUser(page: Page, userKey: TestUserKey = 'user1'): Promise<void> {
  const user = TEST_USERS[userKey]
  if (!user || user.role === 'admin') {
    throw new Error(`Invalid user key: ${userKey}. Must be a non-admin user.`)
  }
  
  await performUILogin(page, user.email, user.password)
}

export async function loginAsAdmin(page: Page): Promise<void> {
  const admin = TEST_USERS.admin
  await performUILogin(page, admin.email, admin.password)
}

export async function logout(page: Page): Promise<void> {
  const userAvatar = page.locator('[data-testid="user-avatar"]').or(
    page.getByRole('button', { name: /menu do usuário/i })
  )
  
  if (await userAvatar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await userAvatar.click()
    
    const logoutButton = page.getByRole('menuitem', { name: /sair/i }).or(
      page.getByRole('button', { name: /sair/i })
    )
    await expect(logoutButton).toBeVisible({ timeout: 5000 })
    
    await Promise.all([
      page.waitForNavigation({ url: '/', waitUntil: 'networkidle' }),
      logoutButton.click()
    ])
  }

  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

export async function ensureLoggedOut(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  const isLoggedIn = await isAuthenticated(page)
  if (isLoggedIn) {
    await logout(page)
  }
  
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

export async function isAuthenticated(page: Page): Promise<boolean> {
  const loginButton = page.getByRole('banner').getByRole('link', { name: 'Entrar' })
  const userAvatar = page.locator('[data-testid="user-avatar"]').or(
    page.getByRole('button', { name: /menu do usuário/i })
  )
  
  try {
    const [loginVisible, avatarVisible] = await Promise.all([
      loginButton.isVisible({ timeout: 2000 }).catch(() => false),
      userAvatar.isVisible({ timeout: 2000 }).catch(() => false)
    ])
    
    return !loginVisible && avatarVisible
  } catch {
    return false
  }
}

export async function getCurrentUserEmail(page: Page): Promise<string | null> {
  if (!await isAuthenticated(page)) {
    return null
  }
  
  try {
    const userEmail = await page.evaluate(() => {
      const storage = localStorage.getItem('supabase.auth.token')
      if (!storage) return null
      
      const parsed = JSON.parse(storage)
      return parsed?.currentSession?.user?.email || null
    })
    
    return userEmail
  } catch {
    return null
  }
}

export async function waitForAuthRedirect(page: Page): Promise<void> {
  await page.waitForNavigation({
    url: url => url.pathname === DASHBOARD_URL || url.pathname === TERMS_URL,
    waitUntil: 'networkidle',
    timeout: 30000
  })
}

export async function verifyAuthenticated(page: Page, expectedEmail?: string): Promise<void> {
  const authenticated = await isAuthenticated(page)
  expect(authenticated, 'User should be authenticated').toBe(true)
  
  if (expectedEmail) {
    const currentEmail = await getCurrentUserEmail(page)
    expect(currentEmail).toBe(expectedEmail)
  }
}