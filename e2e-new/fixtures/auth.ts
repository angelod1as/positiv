import { type Page, expect } from '@playwright/test'
import { TEST_USERS, type TestUserKey } from './test-users'
import { setupUserAsFullyOnboarded } from '../utils/db-cleanup'
import { TEST_USER_PROFILE_DATA } from './test-data'

const LOGIN_URL = '/entrar'
const DASHBOARD_URL = '/dashboard'
const TERMS_URL = '/conta/termos-e-condicoes'

/**
 * Logs in a user with pre-filled profile data to skip onboarding.
 * This is the preferred method for most tests as it's faster and more reliable.
 * 
 * Note: We can't pre-fill data before login because profiles require a user_id
 * which is only created after first authentication. So we log in first, then
 * update the profile data, then navigate to dashboard.
 */
export async function performUILoginWithPrefilledData(page: Page, email: string, password: string): Promise<void> {
  await page.goto(LOGIN_URL)
  await page.waitForLoadState('networkidle')

  const emailInput = page.getByRole('textbox', { name: 'E-mail' })
  const passwordInput = page.getByRole('textbox', { name: 'Senha' })
  const submitButton = page.getByRole('button', { name: 'Entrar' })

  await emailInput.fill(email)
  await passwordInput.fill(password)
  
  // Click submit and wait for navigation
  await submitButton.click()
  
  // Wait for either dashboard or terms page
  await page.waitForURL(url => {
    const pathname = new URL(url).pathname
    return pathname === DASHBOARD_URL || pathname === TERMS_URL
  }, { timeout: 10000 })
  
  // If we're at the terms page, the profile now exists - update it and navigate to dashboard
  if (page.url().includes('termos-e-condicoes')) {
    await setupUserAsFullyOnboarded(email)
    await page.goto(DASHBOARD_URL)
    await page.waitForLoadState('networkidle')
  }

  // Verify we're at dashboard
  await expect(page).toHaveURL(DASHBOARD_URL)
  await page.waitForLoadState('networkidle')
}

/**
 * Performs a full UI login including onboarding flow if needed.
 * Use this when you specifically need to test the onboarding process.
 * For most tests, use loginAsUser() which uses pre-filled data.
 */
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
    await page.getByRole('textbox', { name: 'Nome completo' }).fill(TEST_USER_PROFILE_DATA.full_name)
    await page.getByRole('textbox', { name: 'Nome social ou apelido' }).fill(TEST_USER_PROFILE_DATA.social_name)
    await page.getByRole('textbox', { name: 'RG', exact: true }).fill(TEST_USER_PROFILE_DATA.rg)
    await page.getByRole('textbox', { name: 'Emissor do RG' }).fill(TEST_USER_PROFILE_DATA.rg_issuer)
    await page.getByRole('textbox', { name: 'CPF' }).fill(TEST_USER_PROFILE_DATA.cpf)
    await page.getByRole('textbox', { name: 'Data de nascimento' }).fill(TEST_USER_PROFILE_DATA.date_of_birth)
    await page.getByRole('spinbutton', { name: 'Whatsapp', exact: true }).fill(String(TEST_USER_PROFILE_DATA.phone))
    await page.getByRole('spinbutton', { name: 'Confirme seu whatsapp' }).fill(String(TEST_USER_PROFILE_DATA.phone))
    await page.getByRole('textbox', { name: 'Como chegou até nós?' }).fill(TEST_USER_PROFILE_DATA.how_came_to_us)
    await page.getByRole('textbox', { name: 'Em que cidade você mora?' }).fill(TEST_USER_PROFILE_DATA.where_lives)
    
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
    // Gender
    const genderCheckbox = page.getByRole('checkbox', { name: TEST_USER_PROFILE_DATA.gender[0] })
    await expect(genderCheckbox).toBeVisible()
    await genderCheckbox.check()
    
    // Orientation
    const orientationCheckbox = page.getByRole('checkbox', { name: TEST_USER_PROFILE_DATA.orientation[0] })
    await expect(orientationCheckbox).toBeVisible()
    await orientationCheckbox.check()
    
    // Pronouns
    const pronounsCheckbox = page.getByRole('checkbox', { name: TEST_USER_PROFILE_DATA.pronouns[0] })
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