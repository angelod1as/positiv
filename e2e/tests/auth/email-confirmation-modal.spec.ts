import { test, expect, type Page } from '@playwright/test'
import { emailConfirmationCopy } from '../../../app/copy/account'
import { emailConsentCopy, emailsPageCopy } from '../../../app/copy/emails'
import { headerCopy } from '../../../app/copy/layout'
import { performUILogin } from '../../fixtures/auth'
import {
  createNewsletterTestUser,
  deleteNewsletterTestUser,
  type NewsletterTestUser,
} from '../../utils/newsletter-test-helpers'
import {
  createTestUser,
  deleteTestUser,
  generateTestEmail,
  generateTestPassword,
} from '../../utils/user-management'

/**
 * WEB-54: someone who had an account before the email categories existed has
 * never confirmed them, and is sent to "Seus e-mails" until they do. The users
 * here are made with a complete profile, so the profile update modal stays out
 * of the way and login lands straight on the dashboard.
 */
test.describe('Email choices confirmation modal', () => {
  const createdUsers: NewsletterTestUser[] = []
  const signedUpUserIds: string[] = []

  test.afterEach(async () => {
    for (const user of createdUsers) {
      await deleteNewsletterTestUser(user.id)
    }
    createdUsers.length = 0
    for (const id of signedUpUserIds) {
      await deleteTestUser(id)
    }
    signedUpUserIds.length = 0
  })

  const modal = (page: Page) =>
    page.getByRole('alertdialog', { name: emailConfirmationCopy.title })

  test('An account that never confirmed is sent to confirm, and the modal goes away once saved', async ({
    page,
  }) => {
    const user = await createNewsletterTestUser()
    createdUsers.push(user)

    await performUILogin(page, user.email, user.password)

    await expect(modal(page)).toBeVisible()
    await expect(modal(page)).toContainText(emailConfirmationCopy.message)

    await page
      .getByRole('button', { name: emailConfirmationCopy.cta })
      .click()

    await expect(page).toHaveURL('/emails')
    await expect(modal(page)).toBeHidden()

    // Someone who never answered sees every category ticked
    for (const label of Object.values(emailConsentCopy.labels)) {
      await expect(page.getByRole('checkbox', { name: label })).toBeChecked()
    }

    await page.getByRole('button', { name: emailConsentCopy.save }).click()
    await expect(page.getByText(emailsPageCopy.successToast)).toBeVisible()

    // Leaving without a reload must not bring the modal back
    await page
      .getByRole('link', { name: headerCopy.dashboardTitle })
      .first()
      .click()
    await expect(page).toHaveURL('/dashboard')
    await expect(modal(page)).toBeHidden()

    await page.reload()
    await expect(modal(page)).toBeHidden()
  })

  test('The modal stays off the sign-up pages', async ({ page }) => {
    const user = await createNewsletterTestUser()
    createdUsers.push(user)

    await performUILogin(page, user.email, user.password)

    for (const path of ['/conta/dados-basicos', '/conta/termos-e-condicoes']) {
      await page.goto(path)
      await page.waitForLoadState('domcontentloaded')
      await expect(modal(page)).toBeHidden()
    }
  })

  test('Someone who confirms at sign-up is never asked again', async ({
    page,
  }) => {
    const email = generateTestEmail()
    const password = generateTestPassword()
    const user = await createTestUser(email, password)
    signedUpUserIds.push(user.id)

    await performUILogin(page, email, password, { subscribeToNewsletter: false })

    await expect(modal(page)).toBeHidden()
    await page.reload()
    await expect(modal(page)).toBeHidden()
  })
})
