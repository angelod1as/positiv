import test from "@playwright/test"
import { createMockCredentials } from "e2e/helpers/create-mock-credentials"
import { participantUserFile } from "e2e/helpers/load-user"
import pwLog from "e2e/helpers/log"
import { BasicDataPOM } from "e2e/poms/account/basic-data.pom"
import { GenderPronounOrientationPOM } from "e2e/poms/account/gender-pronouns-orientation.pom"
import { LoginPOM } from "e2e/poms/auth/login.pom"
import { AgreeToTermsPOM } from "e2e/poms/dashboard/agree-to-terms.pom"
import { HomepagePOM } from "e2e/poms/homepage.pom"
import { MailhogPOM } from "e2e/poms/mailhog/mailhog.pom"
import { createMockUser } from "./create-mock-user"

test("Check if Mailhog is running", async ({ page }) => {
  pwLog("checking if Mailhog is running")

  const homepage = new HomepagePOM(page)
  await homepage.goto()
  await homepage.testBasicElements()

  const mailHogPage = new MailhogPOM(await page.context().newPage())
  await mailHogPage.goto()
  await mailHogPage.testBasicElements()
})

test("authenticate as participant", async ({ page }) => {
  pwLog("authenticating as participant")

  const { email, password } = createMockCredentials()
  await createMockUser(email, password, { admin: false })

  const loginPage = new LoginPOM(page)
  await loginPage.goto()
  await loginPage.doStraightLogin(email, password)

  const termsPage = new AgreeToTermsPOM(page)
  await termsPage.testAgreeToTerms()

  const basicDataPage = new BasicDataPOM(page)
  await basicDataPage.testFillBasicData()

  const genderPage = new GenderPronounOrientationPOM(page)
  await genderPage.testFillBasicData()

  // End of authentication steps.
  await page.context().storageState({ path: participantUserFile })
})
