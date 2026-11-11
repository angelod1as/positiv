import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createTestAuthUser, createTestProfile } from "~/test/db-test-utils"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { findOrphanedProfile } from "./profiles.server"

describe("findOrphanedProfile - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("finds the profile left behind under the e-mail", async () => {
    const email = "test-find-orphan@example.com"
    const orphan = await createTestProfile(tracker, kysely, {
      email,
      user_id: null,
      full_name: "Left Behind",
    })

    const found = await findOrphanedProfile(email)

    expect(found?.id).toBe(orphan.id)
    expect(found?.full_name).toBe("Left Behind")
  })

  it("does not hand out a profile that already belongs to an account", async () => {
    const email = "test-find-orphan-owned@example.com"
    const userId = await createTestAuthUser(email, "test1234", tracker)
    await createTestProfile(tracker, kysely, { email, user_id: userId })

    expect(await findOrphanedProfile(email)).toBeUndefined()
  })
})
