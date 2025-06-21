import test from "@playwright/test"
import { createMockCredentials } from "e2e/helpers/create-mock-credentials"
import { adminUserFile, participantUserFile } from "e2e/helpers/load-user"
import pwLog from "e2e/helpers/log"
import { BasicDataPOM } from "e2e/poms/account/basic-data.pom"
import { GenderPronounOrientationPOM } from "e2e/poms/account/gender-pronouns-orientation.pom"
import { LoginPOM } from "e2e/poms/auth/login.pom"
import { AgreeToTermsPOM } from "e2e/poms/dashboard/agree-to-terms.pom"
import { HomepagePOM } from "e2e/poms/homepage.pom"
import { createMockUser } from "./create-mock-user"

test("authenticate as participant", async ({ page }) => {
  pwLog("authenticating as participant")

  const { email, password } = createMockCredentials()
  await createMockUser(email, password, { admin: false })

  const homepage = new HomepagePOM(page)
  await homepage.goto()
  await homepage.testBasicElements()
  await homepage.testLoggedOut()

  const loginPage = new LoginPOM(page)
  await loginPage.goto()
  await loginPage.testBasicElements()
  await loginPage.testInvalidPassword()
  await loginPage.testWrongCredentials()
  await loginPage.doStraightLogin(email, password)

  const termsPage = new AgreeToTermsPOM(page)
  await termsPage.testAgreeToTerms()

  const basicDataPage = new BasicDataPOM(page)
  await basicDataPage.testFillBasicData()

  const genderPage = new GenderPronounOrientationPOM(page)
  await genderPage.testFillBasicData()

  await homepage.goto()
  await homepage.testLoggedIn()

  // End of authentication steps.
  await page.context().storageState({ path: participantUserFile })
})

test("authenticate as admin", async ({ page }) => {
  pwLog("authenticating as admin")

  const { email, password } = createMockCredentials()
  await createMockUser(email, password, { admin: true })

  const homepage = new HomepagePOM(page)
  await homepage.goto()
  await homepage.testBasicElements()
  await homepage.testLoggedOut()

  const loginPage = new LoginPOM(page)
  await loginPage.goto()
  await loginPage.testBasicElements()
  await loginPage.testInvalidPassword()
  await loginPage.testWrongCredentials()
  await loginPage.doStraightLogin(email, password)

  const termsPage = new AgreeToTermsPOM(page)
  await termsPage.testAgreeToTerms()

  const basicDataPage = new BasicDataPOM(page)
  await basicDataPage.testFillBasicData()

  const genderPage = new GenderPronounOrientationPOM(page)
  await genderPage.testFillBasicData()

  await homepage.goto()
  await homepage.testAdminLoggedIn()

  // End of authentication steps.
  await page.context().storageState({ path: adminUserFile })
})
