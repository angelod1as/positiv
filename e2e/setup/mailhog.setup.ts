import test from "@playwright/test"
import pwLog from "e2e/helpers/log"
import { HomepagePOM } from "e2e/poms/homepage.pom"
import { MailhogPOM } from "e2e/poms/mailhog/mailhog.pom"

test("Check if Mailhog is running", async ({ page }) => {
  pwLog("checking if Mailhog is running")

  const homepage = new HomepagePOM(page)
  await homepage.goto()
  await homepage.testBasicElements()

  const mailHogPage = new MailhogPOM(await page.context().newPage())
  await mailHogPage.goto()
  await mailHogPage.testBasicElements()
})
