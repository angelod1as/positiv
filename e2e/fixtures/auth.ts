import { type Page, expect } from "@playwright/test"
import { LoginPage } from "../pages/LoginPage"
import { TEST_USER_PROFILE_DATA } from "./test-data"

const DASHBOARD_URL = "/dashboard"
const ADMIN_DASHBOARD_URL = "/admin"
const TERMS_URL = "/conta/termos-e-condicoes"

/**
 * Logs in a user with pre-filled profile data to skip onboarding.
 * This is the preferred method for most tests as it's faster and more reliable.
 *
 * Note: We can't pre-fill data before login because profiles require a user_id
 * which is only created after first authentication. So we log in first, then
 * update the profile data, then navigate to dashboard.
 */
export async function performUILoginWithPrefilledData(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  const loginPage = new LoginPage(page)

  // Perform login
  await loginPage.login(email, password)

  // Let the natural flow happen - user might be on terms page or dashboard.
  // Never networkidle anywhere in this file: the app talks to the analytics
  // endpoint on its own schedule, and a call that hangs there once took the
  // whole suite down before a single test ran.
  await page.waitForLoadState("domcontentloaded")

  // We should be either on dashboard, admin dashboard, or terms page
  const currentUrl = page.url()
  expect(
    currentUrl.includes("/dashboard") ||
      currentUrl.includes("/admin") ||
      currentUrl.includes("/conta/termos-e-condicoes"),
  ).toBe(true)
}

/**
 * Performs a full UI login including onboarding flow if needed.
 * Use this when you specifically need to test the onboarding process.
 * For most tests, use loginAsUser() which uses pre-filled data.
 */
export async function performUILogin(
  page: Page,
  email: string,
  password: string,
  options?: { subscribeToNewsletter?: boolean; isAdmin?: boolean },
): Promise<void> {
  const { subscribeToNewsletter = true, isAdmin = false } = options || {}
  const expectedDashboardUrl = isAdmin ? ADMIN_DASHBOARD_URL : DASHBOARD_URL
  const loginPage = new LoginPage(page)

  // Perform login
  await loginPage.login(email, password)

  const currentPath = new URL(page.url()).pathname
  if (currentPath === TERMS_URL) {
    // Need to agree to terms first
    const agreeCheckbox = page.locator("label", {
      hasText: "Li tudo e estou de acordo!",
    })
    await expect(agreeCheckbox).toBeVisible({ timeout: 10000 })
    await agreeCheckbox.click()

    // Handle newsletter subscription checkbox (checked by default in UI)
    // Only uncheck if explicitly requested
    if (!subscribeToNewsletter) {
      const mktEmailsCheckbox = page.locator("label", {
        hasText: "Aceito receber e-mails sobre a Positiv",
      })
      await expect(mktEmailsCheckbox).toBeVisible({ timeout: 10000 })
      await mktEmailsCheckbox.click()
    }

    const continueButton = page.getByRole("button", { name: "Continuar" })
    await expect(continueButton).toBeVisible()

    // Click and wait for navigation in a single action
    await continueButton.click()
    // Not networkidle: the page keeps talking to the analytics endpoint, and a
    // call that hangs there is not a reason to fail signing up. The url is the
    // honest signal, and what comes next waits on the fields themselves.
    await page.waitForURL(/dados-basicos$/)

    // One screen holds every field the profile needs.
    await expect(page).toHaveURL(/dados-basicos$/)

    // Fill all required fields
    await page
      .getByRole("textbox", { name: "Nome completo" })
      .fill(TEST_USER_PROFILE_DATA.full_name)
    await page
      .getByRole("textbox", { name: "Nome social ou apelido" })
      .fill(TEST_USER_PROFILE_DATA.social_name)
    await page
      .getByRole("textbox", { name: "RG", exact: true })
      .fill(TEST_USER_PROFILE_DATA.rg)
    await page
      .getByRole("textbox", { name: "Emissor do RG" })
      .fill(TEST_USER_PROFILE_DATA.rg_issuer)
    await page
      .getByRole("textbox", { name: "CPF" })
      .fill(TEST_USER_PROFILE_DATA.cpf)
    await page
      .getByRole("textbox", { name: "Data de nascimento" })
      .fill(TEST_USER_PROFILE_DATA.date_of_birth)
    await page
      .getByRole("spinbutton", { name: "WhatsApp", exact: true })
      .fill(String(TEST_USER_PROFILE_DATA.phone))
    await page
      .getByRole("spinbutton", { name: "Confirme seu whatsapp" })
      .fill(String(TEST_USER_PROFILE_DATA.phone))
    await page
      .getByRole("textbox", { name: "Como chegou até nós?" })
      .fill(TEST_USER_PROFILE_DATA.how_came_to_us)
    await page
      .getByRole("textbox", { name: "Em que cidade você mora?" })
      .fill(TEST_USER_PROFILE_DATA.where_lives)

    // The demographic questions share the screen with everything above them:
    // one form, one Continuar. Their options are pills, not checkboxes.
    for (const answer of [
      TEST_USER_PROFILE_DATA.gender[0],
      TEST_USER_PROFILE_DATA.orientation[0],
      TEST_USER_PROFILE_DATA.pronouns[0],
      TEST_USER_PROFILE_DATA.race_color[0],
    ]) {
      const pill = page.getByRole("button", { name: answer, exact: true })
      await expect(pill).toBeVisible({ timeout: 10000 })
      await pill.click()
      await expect(pill).toHaveAttribute("aria-pressed", "true")
    }

    const saveBasicData = page.getByRole("button", { name: "Continuar" })
    await expect(saveBasicData).toBeVisible()

    if (isAdmin) {
      await Promise.all([
        page.waitForURL(expectedDashboardUrl),
        saveBasicData.click(),
      ])
    } else {
      // First-time signup now ends on the account-ready page, which explains
      // that having an account is not the same as being registered for an event
      await Promise.all([
        page.waitForURL(/conta\/tudo-pronto$/),
        saveBasicData.click(),
      ])

      await expect(
        page.getByRole("heading", { name: /Sua conta está pronta/ }),
      ).toBeVisible()

      await Promise.all([
        page.waitForURL(expectedDashboardUrl),
        page.getByRole("link", { name: "Ver eventos da Positiv" }).click(),
      ])
    }
  }

  await expect(page).toHaveURL(new RegExp(`${expectedDashboardUrl}$`))
  await page.waitForLoadState("domcontentloaded")
}

// These functions are deprecated - use performUILogin directly with dynamic users
// export async function loginAsUser(page: Page, userKey: TestUserKey = 'user1'): Promise<void>
// export async function loginAsUserWithOnboarding(page: Page, userKey: TestUserKey = 'user1'): Promise<void>
// export async function loginAsAdmin(page: Page): Promise<void>

export async function logout(page: Page): Promise<void> {
  const userAvatar = page
    .locator('[data-testid="user-avatar"]')
    .or(page.getByRole("button", { name: /menu do usuário/i }))

  if (await userAvatar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await userAvatar.click()

    const logoutButton = page
      .getByRole("menuitem", { name: /sair/i })
      .or(page.getByRole("button", { name: /sair/i }))
    await expect(logoutButton).toBeVisible({ timeout: 5000 })

    await Promise.all([
      page.waitForURL("/"),
      logoutButton.click(),
    ])
  }

  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
}

export async function ensureLoggedOut(page: Page): Promise<void> {
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")

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
  await page.waitForURL(
    (url) => url.pathname === DASHBOARD_URL || url.pathname === ADMIN_DASHBOARD_URL || url.pathname === TERMS_URL,
    { timeout: 30000 },
  )
}

export async function verifyAuthenticated(
  page: Page,
  expectedEmail?: string,
): Promise<void> {
  const authenticated = await isAuthenticated(page)
  expect(authenticated, "User should be authenticated").toBe(true)

  if (expectedEmail) {
    const currentEmail = await getCurrentUserEmail(page)
    expect(currentEmail).toBe(expectedEmail)
  }
}
