import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { getConsentedVeteranEmails } from "./veterans-list.server"

describe("getConsentedVeteranEmails - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const createProfileWithSubscription = async (
    email: string,
    isVeteran: boolean,
    subscription: { consent_given: boolean; sync_status: string } | null,
  ) => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email,
      is_veteran: isVeteran,
    })

    if (subscription) {
      const row = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          subscription_source: "manual_button",
          ...subscription,
        })
        .returning("id")
        .executeTakeFirstOrThrow()
      tracker.track("newsletter_subscriptions", row.id)
    }

    return profile
  }

  it("should include a veteran who consented and was synced", async () => {
    await createProfileWithSubscription("pos655-consented@example.com", true, {
      consent_given: true,
      sync_status: "synced",
    })

    const emails = await getConsentedVeteranEmails()

    expect(emails).toContain("pos655-consented@example.com")
  })

  it("should exclude a non-veteran who consented", async () => {
    await createProfileWithSubscription("pos655-not-veteran@example.com", false, {
      consent_given: true,
      sync_status: "synced",
    })

    const emails = await getConsentedVeteranEmails()

    expect(emails).not.toContain("pos655-not-veteran@example.com")
  })

  it("should exclude a veteran who never gave consent", async () => {
    await createProfileWithSubscription("pos655-no-consent@example.com", true, {
      consent_given: false,
      sync_status: "pending",
    })
    await createProfileWithSubscription(
      "pos655-no-subscription@example.com",
      true,
      null,
    )

    const emails = await getConsentedVeteranEmails()

    expect(emails).not.toContain("pos655-no-consent@example.com")
    expect(emails).not.toContain("pos655-no-subscription@example.com")
  })

  it("should exclude a veteran who unsubscribed", async () => {
    await createProfileWithSubscription("pos655-unsubscribed@example.com", true, {
      consent_given: true,
      sync_status: "unsubscribed",
    })

    const emails = await getConsentedVeteranEmails()

    expect(emails).not.toContain("pos655-unsubscribed@example.com")
  })
})
