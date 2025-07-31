import { type Page, expect } from '@playwright/test'
import { TEST_USERS, type TestUserKey } from './test-users'
import { setupUserAsFullyOnboarded } from '../utils/db-cleanup'

const LOGIN_URL = '/entrar'
const DASHBOARD_URL = '/dashboard'
const TERMS_URL = '/conta/termos-e-condicoes'

export async function performUILoginWithPrefilledData(page: Page, email: string, password: string): Promise<void> {
  await page.goto(LOGIN_URL)
  await page.waitForLoadState('networkidle')

  const emailInput = page.getByRole('textbox', { name: 'E-mail' })
  const passwordInput = page.getByRole('textbox', { name: 'Senha' })
  const submitButton = page.getByRole('button', { name: 'Entrar' })

  await emailInput.fill(email)
  await passwordInput.fill(password)
  
  // First attempt login
  await submitButton.click()
  
  // Wait for navigation - could go to terms or dashboard
  await page.waitForNavigation({ 
    url: url => url.pathname === DASHBOARD_URL || url.pathname === TERMS_URL,
    waitUntil: 'networkidle',
    timeout: 10000
  })
  
  // If we landed on terms page, user profile now exists and we can update it
  if (page.url().includes('termos-e-condicoes')) {
    // Pre-fill user data to skip onboarding forms
    await setupUserAsFullyOnboarded(email)
    
    // Navigate to dashboard - the loader should check basic_data_filled
    await page.goto(DASHBOARD_URL)
    await page.waitForLoadState('networkidle')
    
    // Should stay at dashboard now
    await expect(page).toHaveURL(new RegExp(`${DASHBOARD_URL}$`))
  } else {
    // Already at dashboard
    await expect(page).toHaveURL(new RegExp(`${DASHBOARD_URL}$`))
  }
  
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
    
    // Wait for form to be fully loaded
    await expect(page.getByText('Gênero')).toBeVisible()
    await expect(page.getByText('Orientação')).toBeVisible()
    await expect(page.getByText('Pronomes')).toBeVisible()
    
    // Select checkboxes using specific values and proper Playwright patterns
    // Select gender: "Mulher cis" (first option)
    const genderCheckbox = page.getByRole('checkbox', { name: 'Mulher cis' })
    await expect(genderCheckbox).toBeVisible()
    await genderCheckbox.check()
    
    // Select orientation: "Hétero" (first option)
    const orientationCheckbox = page.getByRole('checkbox', { name: 'Hétero' })
    await expect(orientationCheckbox).toBeVisible()
    await orientationCheckbox.check()
    
    // Select pronouns: "Ela/dela" (second option for consistency with gender)
    const pronounsCheckbox = page.getByRole('checkbox', { name: 'Ela/dela' })
    await expect(pronounsCheckbox).toBeVisible()
    await pronounsCheckbox.check()
    
    // Verify selections were made
    await expect(genderCheckbox).toBeChecked()
    await expect(orientationCheckbox).toBeChecked()
    await expect(pronounsCheckbox).toBeChecked()
    
    // Click continue button
    const continueButton2 = page.getByRole('button', { name: 'Continuar' })
    await expect(continueButton2).toBeVisible()
    
    await Promise.all([
      page.waitForNavigation({ url: DASHBOARD_URL, waitUntil: 'networkidle' }),
      continueButton2.click()
    ])
  }

  await expect(page).toHaveURL(new RegExp(`${DASHBOARD_URL}$`))
  await page.waitForLoadState('networkidle')
}

export async function loginAsUser(page: Page, userKey: TestUserKey = 'user1'): Promise<void> {
  const user = TEST_USERS[userKey]
  if (!user || user.role === 'admin') {
    throw new Error(`Invalid user key: ${userKey}. Must be a non-admin user.`)
  }
  
  await performUILoginWithPrefilledData(page, user.email, user.password)
}

export async function loginAsUserWithOnboarding(page: Page, userKey: TestUserKey = 'user1'): Promise<void> {
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