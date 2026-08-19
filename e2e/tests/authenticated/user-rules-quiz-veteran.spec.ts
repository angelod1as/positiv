import { test, expect } from '@playwright/test'
import { EventApplicationPage } from '../../pages/EventApplicationPage'
import { ensureTestUserProfileExists } from '../../utils/application-helpers'
import { createOpenRegularEvent } from '../../utils/test-event-helpers'
import { clearVeteranHistory, markProfileAsVeteran } from '../../utils/veteran-helpers'
import { getRulesFormQuestions } from '../../../app/components/forms/custom/rules/rules-questions'

const QUESTION_COUNT = Object.keys(getRulesFormQuestions()).length

test.describe('POS-501: the rules quiz for someone who has been before', () => {
  let applicationPage: EventApplicationPage
  let profileId: string
  const pastEvents: string[] = []

  test.beforeEach(async ({ page }) => {
    applicationPage = new EventApplicationPage(page)
    profileId = await ensureTestUserProfileExists()
  })

  test.afterEach(async () => {
    for (const eventId of pastEvents) {
      await clearVeteranHistory(profileId, eventId)
    }
    pastEvents.length = 0
  })

  const asVeteran = async () => {
    const { eventId } = await markProfileAsVeteran(profileId)
    pastEvents.push(eventId)
  }

  test('someone who has never been answers the whole quiz', async ({ page }) => {
    const event = await createOpenRegularEvent()

    await page.goto(`/dashboard/${event.id}/regras`)

    expect(await applicationPage.isOnRulesPage()).toBe(true)

    expect(await applicationPage.currentProgress()).toEqual({
      index: 1,
      total: QUESTION_COUNT,
    })
  })

  test('a veteran who gets the probes right answers three questions', async ({
    page,
  }) => {
    test.setTimeout(60_000)

    await asVeteran()
    const event = await createOpenRegularEvent()

    await page.goto(`/dashboard/${event.id}/regras`)

    expect(await applicationPage.isOnRulesPage()).toBe(true)

    // The opening question is always the same one, and it is always first.
    expect(await applicationPage.currentQuestionId()).toBe('trigger')
    expect(await applicationPage.currentProgress()).toEqual({
      index: 1,
      total: 3,
    })

    await applicationPage.answerCurrentQuestionCorrectly()
    await applicationPage.answerCurrentQuestionCorrectly()
    await applicationPage.answerCurrentQuestionCorrectly()

    await expect(applicationPage.userDataTitle).toBeVisible({ timeout: 15000 })
  })

  test('a veteran who trips on both probes gets the whole quiz, with no warning', async ({
    page,
  }) => {
    // The long way round, one screen at a time.
    test.setTimeout(180_000)

    await asVeteran()
    const event = await createOpenRegularEvent()

    await page.goto(`/dashboard/${event.id}/regras`)

    expect(await applicationPage.isOnRulesPage()).toBe(true)

    await applicationPage.answerCurrentQuestionCorrectly()

    // First probe: wrong once, then put right. The quiz refuses to move on
    // from a wrong answer, so tripping is the only mistake it can record.
    const firstProbe = await applicationPage.answerCurrentQuestionWrongly()
    expect(await applicationPage.currentQuestionId()).toBe(firstProbe)
    await applicationPage.answerCurrentQuestionCorrectly()

    // Still three screens: one stumble is not the branch.
    expect((await applicationPage.currentProgress()).total).toBe(3)

    const secondProbe = await applicationPage.answerCurrentQuestionWrongly()
    expect(await applicationPage.currentQuestionId()).toBe(secondProbe)

    // The second stumble is the branch, and the count is the only thing that
    // says so — no message, no screen in between.
    expect(await applicationPage.currentProgress()).toEqual({
      index: 3,
      total: QUESTION_COUNT,
    })

    await applicationPage.answerCurrentQuestionCorrectly()

    expect(await applicationPage.currentQuestionId()).not.toBe(secondProbe)
    expect(page.url()).toContain('/regras')

    await applicationPage.fillRulesForm()

    await expect(applicationPage.userDataTitle).toBeVisible({ timeout: 15000 })
  })

  test('a refresh does not hand the short run back to someone who tripped', async ({
    page,
  }) => {
    test.setTimeout(60_000)

    await asVeteran()
    const event = await createOpenRegularEvent()

    await page.goto(`/dashboard/${event.id}/regras`)

    expect(await applicationPage.isOnRulesPage()).toBe(true)

    await applicationPage.answerCurrentQuestionCorrectly()
    await applicationPage.answerCurrentQuestionWrongly()
    await applicationPage.answerCurrentQuestionCorrectly()
    await applicationPage.answerCurrentQuestionWrongly()

    expect((await applicationPage.currentProgress()).total).toBe(QUESTION_COUNT)

    await page.reload()

    expect(await applicationPage.isOnRulesPage()).toBe(true)
    expect((await applicationPage.currentProgress()).total).toBe(QUESTION_COUNT)
  })
})
