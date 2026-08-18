import { expect, test } from '@playwright/test'
import {
  deleteTestUser,
  generateTestEmail,
  waitForUserCreation,
} from '../../fixtures/supabase-mock'
import { RegisterPage } from '../../pages/RegisterPage'
import { createSupabaseAdminClient } from '../../utils/db-cleanup'

const PASSWORD = 'segredo123'

/** Removes the auth user and the profile row an address may have left behind. */
async function forgetAddress(email: string): Promise<void> {
  await deleteTestUser(email)

  const supabase = createSupabaseAdminClient()
  // The profile's user_id FK is ON DELETE SET NULL, so deleting the user leaves
  // the row behind, and profiles.email is unique.
  await supabase.from('profiles').delete().eq('email', email)
}

test.describe('Registration', () => {
  test('shows the whole signup on one screen', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()

    await registerPage.verifyRegistrationPageDisplayed()
    await registerPage.verifyPasswordsAreMasked()
  })

  test('refuses mismatched passwords in the browser, without leaving the page', async ({
    page,
  }) => {
    const email = generateTestEmail()
    const registerPage = new RegisterPage(page)

    try {
      await registerPage.register(email, PASSWORD, 'outra-senha')

      await expect(registerPage.confirmPasswordError).toBeVisible()
      await expect(page).toHaveURL('/registrar')

      // Nothing was sent, so nothing was created.
      const supabase = createSupabaseAdminClient()
      const { data } = await supabase.auth.admin.listUsers()
      expect(data.users.find((user) => user.email === email)).toBeUndefined()
    } finally {
      await forgetAddress(email)
    }
  })

  test('refuses someone who did not say they are over 18', async ({ page }) => {
    const email = generateTestEmail()
    const registerPage = new RegisterPage(page)

    try {
      await registerPage.goto()
      await registerPage.emailInput.fill(email)
      await registerPage.passwordInput.fill(PASSWORD)
      await registerPage.confirmPasswordInput.fill(PASSWORD)
      await registerPage.provideCaptchaToken()
      await registerPage.submitButton.click()

      await expect(registerPage.over18Error).toBeVisible()
      await expect(page).toHaveURL('/registrar')
    } finally {
      await forgetAddress(email)
    }
  })

  test('registers a new person and sends them to confirm their e-mail', async ({
    page,
  }) => {
    const email = generateTestEmail()
    const registerPage = new RegisterPage(page)

    try {
      await registerPage.register(email, PASSWORD)

      await registerPage.waitForSuccessRedirect()
      await registerPage.verifyConfirmEmailPageDisplayed()

      expect(await waitForUserCreation(email)).toBe(true)
    } finally {
      await forgetAddress(email)
    }
  })

  test('registers even when the captcha widget cannot be reached', async ({
    page,
  }) => {
    const email = generateTestEmail()

    // What a CI run without egress to Cloudflare looks like. The suite must
    // still be able to sign someone up, or this whole file goes red there for
    // reasons that have nothing to do with the form. The token is handed over
    // directly rather than waited for, so this exercises that path on every
    // run instead of only on the runs that happen to be cut off.
    await page.route(/challenges\.cloudflare\.com/, (route) => route.abort())

    const registerPage = new RegisterPage(page)

    try {
      await registerPage.goto()
      await expect(registerPage.turnstileIframe).toHaveCount(0)

      await registerPage.fillRegistrationForm(email, PASSWORD, undefined, {
        captcha: 'direct',
      })
      await registerPage.submitButton.click()

      await registerPage.waitForSuccessRedirect()
      await registerPage.verifyConfirmEmailPageDisplayed()

      expect(await waitForUserCreation(email)).toBe(true)
    } finally {
      await forgetAddress(email)
    }
  })

  test('an address that already has an account is answered exactly like a new one', async ({
    page,
  }) => {
    const email = generateTestEmail()
    const registerPage = new RegisterPage(page)

    try {
      await registerPage.register(email, PASSWORD)
      await registerPage.waitForSuccessRedirect()
      expect(await waitForUserCreation(email)).toBe(true)

      // Same address, second time. The answer must be the same screen a brand
      // new signup gets, with nothing on the page hinting the address is taken.
      await registerPage.register(email, PASSWORD)
      await registerPage.waitForSuccessRedirect()
      await registerPage.verifyConfirmEmailPageDisplayed()
      await registerPage.verifyNothingRevealsAnExistingAccount()
    } finally {
      await forgetAddress(email)
    }
  })

  test('turns a claimed profile away on the e-mail field', async ({ page }) => {
    const email = generateTestEmail()
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) throw error

    // A claimed profile is one whose user_id is set.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ email, user_id: data.user.id }, { onConflict: 'email' })
    if (profileError) throw profileError

    try {
      const registerPage = new RegisterPage(page)
      await registerPage.register(email, PASSWORD)

      await expect(registerPage.claimedProfileError).toBeVisible()
      await expect(page).toHaveURL('/registrar')

      // The message must send them to password recovery, never announce that
      // the address is registered.
      await registerPage.verifyNothingRevealsAnExistingAccount()

      // What they typed is still there, so they are not made to start over.
      await expect(registerPage.emailInput).toHaveValue(email)
    } finally {
      await forgetAddress(email)
    }
  })
})
