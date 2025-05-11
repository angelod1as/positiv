import test from "@playwright/test"
import { createMockCredentials } from "e2e/helpers/create-mock-credentials"
import { participantUserFile } from "e2e/helpers/load-user"
import pwLog from "e2e/helpers/log"
import { BasicDataPOM } from "e2e/poms/account/basic-data.pom"
import { LoginPOM } from "e2e/poms/auth/login.pom"
import { AgreeToTermsPOM } from "e2e/poms/dashboard/agree-to-terms.pom"
import { createMockUser } from "./create-mock-user"

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

  // End of authentication steps.
  await page.context().storageState({ path: participantUserFile })
})
