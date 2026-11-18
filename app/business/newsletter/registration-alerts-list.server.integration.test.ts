import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { getRegistrationAlertsProfiles } from "./registration-alerts-list.server"

describe("getRegistrationAlertsProfiles - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const profileWithAlerts = async (email: string, alerts: boolean) => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email,
    })
    await kysely
      .updateTable("email_consents")
      .set({ registration_alerts: alerts })
      .where("profile_id", "=", profile.id)
      .execute()
    return profile
  }

  it("returns the profiles with Registration alerts on, and only them", async () => {
    const on = await profileWithAlerts("web52-alerts-on@example.com", true)
    await profileWithAlerts("web52-alerts-off@example.com", false)

    const emails = (await getRegistrationAlertsProfiles()).map((p) => p.email)

    expect(emails).toContain(on.email)
    expect(emails).not.toContain("web52-alerts-off@example.com")
  })

  it("includes a new profile, whose alerts are on by default", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "web52-alerts-default@example.com",
    })

    const ids = (await getRegistrationAlertsProfiles()).map((p) => p.id)

    expect(ids).toContain(profile.id)
  })
})
