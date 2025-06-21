import { test, type Browser } from "@playwright/test"

export const adminUserFile = "playwright/.auth/admin.json"
export const participantUserFile = "playwright/.auth/user.json"

export const loadUser = (user: "participant" | "admin") => {
  if (user === "admin") {
    return test.use({ storageState: adminUserFile })
  }
  return test.use({ storageState: participantUserFile })
}

export const getAdminContext = async (browser: Browser) =>
  await browser.newContext({ storageState: adminUserFile })
export const getParticipantContext = async (browser: Browser) =>
  await browser.newContext({ storageState: participantUserFile })
