import { expect, test } from '@playwright/test'
import { likertPageCopy } from '../../../app/copy/account'
import { performUILogin } from '../../fixtures/auth'
import { EventApplicationPage } from '../../pages/EventApplicationPage'
import { LikertAnswerPage } from '../../pages/LikertAnswerPage'
import { readLikertStatements, setLikertSettings } from '../../utils/likert-helpers'
import { createOpenRegularEvent } from '../../utils/test-event-helpers'
import {
  createTestUser,
  generateTestEmail,
  generateTestPassword,
} from '../../utils/user-management'

test.describe('WEB-67: the Likert scale comes before the first application', () => {
  // The shared participant may have answered already; whoever never did has to
  // be someone new.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('someone who never answered is taken to the scale, then back to the application', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const total = readLikertStatements().length
    const likert = new LikertAnswerPage(page)
    const applicationPage = new EventApplicationPage(page)

    const email = generateTestEmail()
    const password = generateTestPassword()
    await createTestUser(email, password)
    const event = await createOpenRegularEvent()

    try {
      await setLikertSettings({ enabled: false, required: true })
      await performUILogin(page, email, password)

      await page.goto(`/dashboard/${event.id}/regras`)

      await expect(page).toHaveURL(`/conta/escala/responder?evento=${event.id}`)
      await expect(page.getByText(likertPageCopy.beforeApplying)).toBeVisible()
      await expect(likert.statement()).toBeVisible()
      await likert.waitForHydration()

      for (let index = 1; index <= total; index++) {
        await likert.expectPosition(index, total)
        const before = await likert.statementText()
        await page.keyboard.press('4')
        await likert.expectPicked(4)
        await page.keyboard.press('Enter')
        if (index < total) await likert.expectMovedFrom(before)
      }

      await expect(page).toHaveURL(`/dashboard/${event.id}/regras`)
      expect(await applicationPage.isOnRulesPage()).toBe(true)
    } finally {
      await setLikertSettings({ enabled: false, required: false })
    }
  })
})
