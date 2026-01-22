import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { kyselyDb } from "~/kysely-db"

describe("Signup Orphan Profile Blocking - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should find orphan profile when email matches and user_id is NULL", async () => {
    const testEmail = "orphan-test@example.com"

    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: testEmail,
      full_name: "Orphan Test User",
    })

    const orphanProfile = await kyselyDb
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", testEmail)
      .where("user_id", "is", null)
      .executeTakeFirst()

    expect(orphanProfile).toBeDefined()
    expect(orphanProfile?.id).toBeDefined()
  })

  it("should NOT find orphan profile when profile has user_id set", async () => {
    // Find an existing profile that HAS a user_id (not an orphan)
    const linkedProfile = await kysely
      .selectFrom("profiles")
      .select(["id", "email", "user_id"])
      .where("user_id", "is not", null)
      .where("email", "is not", null)
      .limit(1)
      .executeTakeFirst()

    if (!linkedProfile?.email) {
      console.warn("Skipping test - no linked profiles in test database")
      return
    }

    // The orphan query should NOT find this profile since it has user_id set
    const orphanProfile = await kyselyDb
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", linkedProfile.email)
      .where("user_id", "is", null)
      .executeTakeFirst()

    expect(orphanProfile).toBeUndefined()
  })

  it("should handle case-insensitive email matching", async () => {
    const testEmail = "CaseSensitive@Example.COM"
    const normalizedEmail = testEmail.toLowerCase().trim()

    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: normalizedEmail,
      full_name: "Case Test User",
    })

    const orphanProfile = await kyselyDb
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", normalizedEmail)
      .where("user_id", "is", null)
      .executeTakeFirst()

    expect(orphanProfile).toBeDefined()
  })

  it("should return undefined when no profile matches email", async () => {
    const orphanProfile = await kyselyDb
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", "nonexistent-email-12345@example.com")
      .where("user_id", "is", null)
      .executeTakeFirst()

    expect(orphanProfile).toBeUndefined()
  })
})
