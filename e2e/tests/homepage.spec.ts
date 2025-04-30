import { test } from "@playwright/test"
import { HomepagePOM } from "e2e/poms/homepage.pom"

test("has title", async ({ page }) => {
  const homepage = new HomepagePOM(page)
  await homepage.goto()
  await homepage.basicElements()
})
