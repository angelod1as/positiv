import { test } from "@playwright/test"
import { HomepagePOM } from "e2e/poms/homepage.pom"

test("Homepage", async ({ page }) => {
  const homepage = new HomepagePOM(page)
  await homepage.goto()
  await homepage.testBasicElements()
  await homepage.testLoggedOut()
})
