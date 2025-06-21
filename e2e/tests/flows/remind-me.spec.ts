import { test } from "@playwright/test"
import {
  getAdminContext,
  getParticipantContext,
  loadUser,
} from "e2e/helpers/load-user"
import { AdminDashboardPOM } from "e2e/poms/admin/admin-dashboard-page.pom"
import { DashboardPOM } from "e2e/poms/dashboard/dashboard.pom"
import { MailhogPOM } from "e2e/poms/mailhog/mailhog.pom"
import { createMockEventReminders } from "e2e/setup/create-mock-event-reminders"

loadUser("admin")
loadUser("participant")
test("Apply to event", async ({ browser }) => {
  await createMockEventReminders()

  const participantContext = await getParticipantContext(browser)
  const participantPage = await participantContext.newPage()
  const adminContext = await getAdminContext(browser)
  const adminPage = await adminContext.newPage()

  const participantDashboard = new DashboardPOM(participantPage)
  await participantDashboard.goto()
  await participantDashboard.testRemindMeFunction()

  const adminDashboard = new AdminDashboardPOM(adminPage)
  await adminDashboard.goto()
  await adminDashboard.testBasicElements()
  await adminDashboard.testRemindMeEmails()

  const mailHogPage = new MailhogPOM(await adminPage.context().newPage())
  await mailHogPage.goto()
  await mailHogPage.testBasicElements()
  await mailHogPage.testReminderEmail()

  await participantDashboard.goto()
  await participantDashboard.testCancelRemindMeFunction()
})
