import { test } from "@playwright/test"
import { loadUser } from "e2e/helpers/load-user"
import { DashboardPOM } from "e2e/poms/dashboard/dashboard.pom"
import { RulesPOM } from "e2e/poms/events/rules.pom"

loadUser("participant")
test("Rules page", async ({ page }) => {
  const dashboardPage = new DashboardPOM(page)
  await dashboardPage.goto()
  await dashboardPage.goToEventApplication()

  const rulesPage = new RulesPOM(page)
  await rulesPage.testBasicElements()
  await rulesPage.testRulesFormErrors()
})
