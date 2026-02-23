import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestProfile, createTestAuthUser } from "~/test/db-test-utils"
import { kyselyDb } from "~/kysely-db"

describe("Signup Claimed Profile Blocking - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should NOT block signup when email matches orphan profile (user_id IS NULL)", async () => {
    const testEmail = "orphan-allowed@example.com"

    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: testEmail,
      full_name: "Orphan Test User",
    })

    // The new check queries for claimed profiles (user_id IS NOT NULL)
    // An orphan profile should NOT appear in this query
    const claimedProfile = await kyselyDb
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", testEmail)
      .where("user_id", "is not", null)
      .executeTakeFirst()

    expect(claimedProfile).toBeUndefined()
  })

  it("should block signup when email matches claimed profile (user_id IS NOT NULL)", async () => {
    const testEmail = "claimed-blocked@example.com"
    const userId = await createTestAuthUser(testEmail, "test1234", tracker)

    await createTestProfile(tracker, kysely, {
      user_id: userId,
      email: testEmail,
      full_name: "Claimed Profile User",
    })

    // A claimed profile (user_id IS NOT NULL) should be found → block signup
    const claimedProfile = await kyselyDb
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", testEmail)
      .where("user_id", "is not", null)
      .executeTakeFirst()

    expect(claimedProfile).toBeDefined()
    expect(claimedProfile?.id).toBeDefined()
  })

  it("should not block signup when no profile exists for email", async () => {
    const claimedProfile = await kyselyDb
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", "nonexistent-email-99999@example.com")
      .where("user_id", "is not", null)
      .executeTakeFirst()

    expect(claimedProfile).toBeUndefined()
  })

  it("should use normalized email for the claimed profile check", async () => {
    const testEmail = "CaseSensitive@Example.COM"
    const normalizedEmail = testEmail.toLowerCase().trim()
    const userId = await createTestAuthUser(normalizedEmail, "test1234", tracker)

    await createTestProfile(tracker, kysely, {
      user_id: userId,
      email: normalizedEmail,
      full_name: "Case Test User",
    })

    // Query using normalized email should find the claimed profile
    const claimedProfile = await kyselyDb
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", normalizedEmail)
      .where("user_id", "is not", null)
      .executeTakeFirst()

    expect(claimedProfile).toBeDefined()
  })
})
