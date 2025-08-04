import { type Page, expect } from '@playwright/test'
import { TEST_USER_PROFILE_DATA } from './test-data'
import { LoginPage } from '../pages/LoginPage'

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
  const loginPage = new LoginPage(page)
  
  // Perform login
  await loginPage.login(email, password)
  
  // Let the natural flow happen - user might be on terms page or dashboard
  await page.waitForLoadState('networkidle')
  
  // We should be either on dashboard or terms page
  const currentUrl = page.url()
  expect(currentUrl.includes('/dashboard') || currentUrl.includes('/conta/termos-e-condicoes')).toBe(true)
}

/**
 * Performs a full UI login including onboarding flow if needed.
 * Use this when you specifically need to test the onboarding process.
 * For most tests, use loginAsUser() which uses pre-filled data.
 */
export async function performUILogin(page: Page, email: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page)
  
  // Perform login
  await loginPage.login(email, password)

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
    
    // Select checkboxes using label locators for better reliability
    // Gender
    const genderLabel = page.locator('label').filter({ hasText: TEST_USER_PROFILE_DATA.gender[0] })
    await expect(genderLabel).toBeVisible({ timeout: 10000 })
    await genderLabel.click()
    
    // Orientation
    const orientationLabel = page.locator('label').filter({ hasText: TEST_USER_PROFILE_DATA.orientation[0] })
    await expect(orientationLabel).toBeVisible({ timeout: 10000 })
    await orientationLabel.click()
    
    // Pronouns
    const pronounsLabel = page.locator('label').filter({ hasText: TEST_USER_PROFILE_DATA.pronouns[0] })
    await expect(pronounsLabel).toBeVisible({ timeout: 10000 })
    await pronounsLabel.click()
    
    // Give a moment for the checkboxes to be checked
    await page.waitForTimeout(500)
    
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

// These functions are deprecated - use performUILogin directly with dynamic users
// export async function loginAsUser(page: Page, userKey: TestUserKey = 'user1'): Promise<void>
// export async function loginAsUserWithOnboarding(page: Page, userKey: TestUserKey = 'user1'): Promise<void>
// export async function loginAsAdmin(page: Page): Promise<void>

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
  const loginPage = new LoginPage(page)
  return await loginPage.isLoggedIn()
}

export async function getCurrentUserEmail(page: Page): Promise<string | null> {
  const loginPage = new LoginPage(page)
  return await loginPage.getCurrentUserEmail()
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