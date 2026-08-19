import { expect, test } from "@playwright/test"
import {
  createTestApplication,
  ensureTestUserProfileExists,
  getFirstOpenEvent,
} from "../../utils/application-helpers"
import { cleanupEventParticipations } from "../../utils/db-cleanup"
import { ensureMinimumOpenEvents } from "../../utils/test-event-helpers"

// Landing here from a finished application is covered by the application page
// object, which every walk of the flow goes through. These tests are about the
// page itself: what it says, and who is allowed to read it.
test.describe("POS-482: Application confirmation page", () => {
  test("tells someone who applied what happens next", async ({ page }) => {
    const profileId = await ensureTestUserProfileExists()
    await cleanupEventParticipations(profileId, true)
    const [event] = await ensureMinimumOpenEvents(1)
    await createTestApplication(profileId, event.id)

    await page.goto(`/dashboard/${event.id}/candidatura-enviada`)

    await expect(
      page.getByRole("heading", { name: "Candidatura enviada! 🎉" }),
    ).toBeVisible()
    await expect(
      page.getByText(/candidatura não garante uma vaga/),
    ).toBeVisible()
    await expect(
      page.getByText(/a organização seleciona quem vai e entra em contato/),
    ).toBeVisible()
    await expect(
      page.getByText(/um e-mail com os detalhes do evento/),
    ).toBeVisible()

    await page.getByRole("link", { name: "Voltar para o painel" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("is not reachable without an application", async ({ page }) => {
    const profileId = await ensureTestUserProfileExists()
    await cleanupEventParticipations(profileId, true)

    const event = await getFirstOpenEvent()
    expect(event).toBeTruthy()
    if (!event) return

    await page.goto(`/dashboard/${event.id}/candidatura-enviada`)

    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
