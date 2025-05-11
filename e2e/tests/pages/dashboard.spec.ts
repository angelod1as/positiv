import { test } from "@playwright/test"
import { loadUser } from "e2e/helpers/load-user"
import { DashboardPOM } from "e2e/poms/dashboard/dashboard.pom"

loadUser("participant")
test("Dashboard", async ({ page }) => {
  const dashboard = new DashboardPOM(page)
  await dashboard.goto()
  await dashboard.testBasicElements()
  await dashboard.testNotAppliedButtons()
})
