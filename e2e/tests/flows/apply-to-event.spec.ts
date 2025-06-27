import { test } from "@playwright/test"
import { loadUser } from "e2e/helpers/load-user"
import { DashboardPOM } from "e2e/poms/dashboard/dashboard.pom"
import { RulesPOM } from "e2e/poms/events/rules.pom"
import { UserDataPOM } from "e2e/poms/events/user-data.pom"
import { MailhogPOM } from "e2e/poms/mailhog/mailhog.pom"

loadUser("participant")
test("Apply to event", async ({ page }) => {
  const dashboard = new DashboardPOM(page)
  await dashboard.goto()
  await dashboard.testNotAppliedButtons()
  await dashboard.goToEventApplication()

  const rulesPage = new RulesPOM(page)
  await rulesPage.testRulesFormErrors()
  await rulesPage.fillRulesForm()
  await rulesPage.continue()

  const userDataPage = new UserDataPOM(page)
  await userDataPage.testBasicElements()
  await userDataPage.fillUserDataForm()
  await userDataPage.applyToEvent()

  // TODO: turn on when calendar is fixed
  // await dashboard.testDownloadCalendar()
  await dashboard.cancelApplication()

  const mailHogPage = new MailhogPOM(await page.context().newPage())
  await mailHogPage.goto()
  await mailHogPage.testBasicElements()
  await mailHogPage.testApplicationEmail()
})
