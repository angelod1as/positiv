import { test } from "@playwright/test"
import { loadUser } from "e2e/helpers/load-user"
import { DashboardPOM } from "e2e/poms/dashboard/dashboard.pom"
import { RulesPOM } from "e2e/poms/events/rules.pom"

loadUser("participant")
test("Apply to event", async ({ page }) => {
  const dashboard = new DashboardPOM(page)
  await dashboard.goto()
  await dashboard.testNotAppliedButtons()
  await dashboard.goToEventApplication()

  const rulesPage = new RulesPOM(page)
  await rulesPage.fillRulesForm()
  await rulesPage.confirmApplication()
  await rulesPage.checkApplicationEmail()

  await dashboard.cancelApplication()
})
