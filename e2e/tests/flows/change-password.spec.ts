import test from "@playwright/test"
import { AccountPOM } from "e2e/poms/account/account.pom"
import { BasicDataPOM } from "e2e/poms/account/basic-data.pom"
import { ChangePasswordPOM } from "e2e/poms/account/change-password.pom"
import { GenderPronounOrientationPOM } from "e2e/poms/account/gender-pronouns-orientation.pom"
import { LoginPOM } from "e2e/poms/auth/login.pom"
import { AgreeToTermsPOM } from "e2e/poms/dashboard/agree-to-terms.pom"
import { HomepagePOM } from "e2e/poms/homepage.pom"

test("Change password", async ({ page }) => {
  const homepage = new HomepagePOM(page)
  await homepage.goToLogin()

  const loginPage = new LoginPOM(page)
  const { email, password } = await loginPage.doLogin()

  const termsPage = new AgreeToTermsPOM(page)
  await termsPage.testAgreeToTerms()

  const basicDataPage = new BasicDataPOM(page)
  await basicDataPage.testFillBasicData()

  const genderPage = new GenderPronounOrientationPOM(page)
  await genderPage.testFillBasicData()

  const accountPage = new AccountPOM(page)
  await accountPage.goto()
  await accountPage.goToChangePassword()

  const newPassword = `${password}-1`

  const changePasswordPage = new ChangePasswordPOM(page)
  await changePasswordPage.testChangePassword(newPassword)

  await accountPage.logout()

  await loginPage.goto()
  await loginPage.doStraightLogin(email, newPassword, true)
})
