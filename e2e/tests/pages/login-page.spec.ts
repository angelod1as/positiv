import { test } from "@playwright/test"
import { LoginPOM } from "e2e/poms/auth/login.pom"

test("Login page", async ({ page }) => {
  const loginPage = new LoginPOM(page)
  await loginPage.goto()
  await loginPage.testBasicElements()
  await loginPage.testInvalidPassword()
  await loginPage.testWrongCredentials()
  // doLogin is tested in global.setup.ts
})
