import { test } from "@playwright/test"
import { getParticipantContext, loadUser } from "e2e/helpers/load-user"
import { DashboardPOM } from "e2e/poms/dashboard/dashboard.pom"

loadUser("participant")
test("Apply to event", async ({ browser }) => {
  const participantContext = await getParticipantContext(browser)
  const participantPage = await participantContext.newPage()
  // const adminContext = await getAdminContext(browser)
  // const adminPage = await adminContext.newPage()

  const participantDashboard = new DashboardPOM(participantPage)
  await participantDashboard.goto()
  await participantDashboard.testRemindMeFunction()

  // TODO: Admin test email
  // const mailHogPage = new MailhogPOM(await page.context().newPage())
  // await mailHogPage.goto()
  // await mailHogPage.testBasicElements()
  // await mailHogPage.testApplicationEmail()

  await participantDashboard.goto()
  await participantDashboard.testCancelRemindMeFunction()
})
