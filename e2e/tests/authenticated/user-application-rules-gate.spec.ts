import { expect, test } from "@playwright/test"
import { EventApplicationPage } from "../../pages/EventApplicationPage"
import { createOpenRegularEvent } from "../../utils/test-event-helpers"

test.describe("POS-487: the application form belongs to one event", () => {
  test("passing one event's quiz does not open another event's form", async ({
    page,
  }) => {
    // Fourteen screens, each one a round trip through the runtime.
    test.setTimeout(120_000)

    const [answered, untouched] = await Promise.all([
      createOpenRegularEvent(),
      createOpenRegularEvent(),
    ])

    const applicationPage = new EventApplicationPage(page)

    await page.goto(`/dashboard/${answered.id}/regras`)
    expect(await applicationPage.isOnRulesPage()).toBe(true)

    await applicationPage.fillRulesForm()
    await expect(applicationPage.userDataTitle).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(new RegExp(`${answered.id}/dados`))

    await page.goto(`/dashboard/${untouched.id}/dados`)

    await expect(page).toHaveURL(new RegExp(`${untouched.id}/regras`))
    expect(await applicationPage.isOnRulesPage()).toBe(true)
  })

  test("the form refuses a submission from a browser that skipped the quiz", async ({
    request,
  }) => {
    const event = await createOpenRegularEvent()

    // Straight at the endpoint, carrying the session cookie of someone logged
    // in who never opened the quiz. The old guard lived in a loader, and a
    // loader never runs before a submission.
    const response = await request.post(`/api/events/${event.id}/application`, {
      data: { referred: "ninguém", bond: "Posso ir sozinhe." },
    })

    expect(response.status()).toBe(403)
  })
})
