import test, { expect } from "@playwright/test"
import { HomepagePOM } from "e2e/poms/homepage.pom"

test("Check if Mailhog is running", async ({ page }) => {
  const homepage = new HomepagePOM(page)
  await homepage.goto()
  expect(page.getByText("evento de gente pelada")).toBeVisible()

  const mailHogPage = await page.context().newPage()
  await mailHogPage.goto("http://localhost:8025")
  await expect(mailHogPage.getByRole("link", { name: "MailHog" })).toBeVisible()
})
