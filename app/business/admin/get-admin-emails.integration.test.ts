import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { getAdminEmails } from "./get-admin-emails.server"

describe("getAdminEmails - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return an array of strings", async () => {
    const result = await getAdminEmails()

    expect(Array.isArray(result)).toBe(true)
    result.forEach(email => {
      expect(typeof email).toBe("string")
      expect(email).toMatch(/@/)
    })
  })

  it("should use distinct to avoid duplicate emails", async () => {
    const result = await getAdminEmails()

    const uniqueEmails = [...new Set(result)]
    expect(result).toEqual(uniqueEmails)
  })

  it("should only return emails from profiles with admin role", async () => {
    const result = await getAdminEmails()

    for (const email of result) {
      const profile = await kysely
        .selectFrom("profiles")
        .innerJoin("user_roles", "profiles.user_id", "user_roles.user_id")
        .where("profiles.email", "=", email)
        .where("user_roles.role_name", "=", "admin")
        .select("profiles.email")
        .executeTakeFirst()

      expect(profile).toBeDefined()
      expect(profile?.email).toBe(email)
    }
  })
})
