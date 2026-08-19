import { test, expect } from '@playwright/test'
import path from 'path'
import { createSoonOpenEvent, openParticipantDashboard } from '../../utils/direct-application-helpers'
import { EventApplicationPage } from '../../pages/EventApplicationPage'

// The narrowest phone still in use, the one most people hold, and a large one.
const PHONE_WIDTHS = [320, 375, 414]

// What a finger needs. Both axes, because the way back is an icon button whose
// width comes from the card around it rather than from its own label.
const TOUCH_TARGET = 44

/**
 * How far the page can be scrolled sideways. Anything above zero means content
 * has left the screen, which on a form is the worst kind of break: the reader
 * cannot see what went missing.
 */
const sidewaysScroll = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )

/** Every alternative row and every button on the screen, as measured boxes. */
const targets = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const form = document.querySelector('form')
    if (!form) return []

    const rows = [...form.querySelectorAll('label')].filter((label) =>
      label.querySelector('input[type=radio], input[type=checkbox]'),
    )

    return [...rows, ...form.querySelectorAll('button')].map((element) => {
      const box = element.getBoundingClientRect()
      return {
        what: (element.textContent || '').trim().slice(0, 40) || element.tagName,
        width: Math.round(box.width),
        height: Math.round(box.height),
      }
    })
  })

test.describe('POS-512: the rules quiz on a phone', () => {
  test.use({
    storageState: path.resolve(import.meta.dirname, '../../.auth/user.json'),
  })

  for (const width of PHONE_WIDTHS) {
    test(`never scrolls sideways at ${width}px`, async ({ page }) => {
      const event = await createSoonOpenEvent(`Mobile quiz ${width}`)

      await page.setViewportSize({ width, height: 720 })

      // Claims the terms, which a fresh account meets before any event.
      await openParticipantDashboard(page)

      await page.goto(`/dashboard/${event.id}/regras`)
      await page.waitForLoadState('networkidle')

      const application = new EventApplicationPage(page)
      await expect(application.rulesTitle).toBeVisible({ timeout: 30000 })

      // Three screens is enough to meet a single-answer question, a
      // multiple-answer one and the way back, which only exists from the
      // second screen on.
      for (let screen = 0; screen < 3; screen++) {
        expect(await sidewaysScroll(page)).toBeLessThanOrEqual(0)

        for (const target of await targets(page)) {
          expect(
            target.width,
            `${target.what} is ${target.width}px wide`,
          ).toBeGreaterThanOrEqual(TOUCH_TARGET)
          expect(
            target.height,
            `${target.what} is ${target.height}px tall`,
          ).toBeGreaterThanOrEqual(TOUCH_TARGET)
        }

        await application.answerCurrentQuestionCorrectly()
      }

      expect(await sidewaysScroll(page)).toBeLessThanOrEqual(0)
    })
  }
})
