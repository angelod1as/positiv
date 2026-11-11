import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestProfile, createTestAuthUser } from "~/test/db-test-utils"
import { participantCopy } from "~/copy/participant"
import { agreeToTerms } from "./agree-to-terms.server"
import type { z } from "zod"
import type { contextSchema } from "~/business/auth/auth-schemas"
import { sessionClientThatThrows } from "~/test/session-client-that-throws"

vi.mock("~/business/newsletter/auto-subscribe.server", () => ({
  subscribeProfileToNewsletter: vi.fn().mockResolvedValue({
    success: true,
    data: { syncStatus: "synced" },
    errors: [],
  }),
}))

vi.mock("~/business/newsletter/subscription-helpers.server", () => ({
  unsubscribeProfile: vi.fn().mockResolvedValue({
    success: true,
    errors: [],
  }),
}))

const noSupabase = sessionClientThatThrows("agreeToTerms")

describe("agreeToTerms orphan profile linking - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const buildContext = (
    userId: string,
    email: string,
  ): z.infer<typeof contextSchema> => ({
    supabase: noSupabase as z.infer<typeof contextSchema>["supabase"],
    supabaseHeaders: new Headers(),
    currentUser: { id: userId, email },
    currentProfile: null,
    isProdInDev: false,
    host: "localhost",
  })

  it("should link orphan profile to auth user during agree-to-terms", async () => {
    const testEmail = "orphan-link-test@example.com"
    const userId = await createTestAuthUser(testEmail, "test1234", tracker)

    const orphanProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: testEmail,
      full_name: "Orphan User",
    })

    const context = buildContext(userId, testEmail)
    const values = { agree: true, commonEmails: true, mktEmails: false }

    const result = await agreeToTerms(values, context)
    expect(result).toMatchObject({ success: true })

    const updatedProfile = await kysely
      .selectFrom("profiles")
      .select(["id", "user_id"])
      .where("id", "=", orphanProfile.id)
      .executeTakeFirstOrThrow()

    expect(updatedProfile.user_id).toBe(userId)
  })

  it("should create a new profile when no orphan profile exists", async () => {
    const testEmail = "no-orphan-test@example.com"
    const userId = await createTestAuthUser(testEmail, "test1234", tracker)

    const context = buildContext(userId, testEmail)
    const values = { agree: true, commonEmails: true, mktEmails: false }

    const result = await agreeToTerms(values, context)
    expect(result).toMatchObject({ success: true })

    const newProfile = await kysely
      .selectFrom("profiles")
      .select(["id", "user_id", "email"])
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow()

    tracker.track("profiles", newProfile.id)

    expect(newProfile.user_id).toBe(userId)
    expect(newProfile.email).toBe(testEmail)
  })

  it("refuses to create a profile under another person's e-mail", async () => {
    const victimEmail = "test-terms-victim@example.com"
    const victimId = await createTestAuthUser(victimEmail, "test1234", tracker)
    const victim = await createTestProfile(tracker, kysely, {
      user_id: victimId,
      email: victimEmail,
    })
    const userId = await createTestAuthUser(
      "test-terms-intruder@example.com",
      "test1234",
      tracker,
    )

    const result = await agreeToTerms(
      { agree: true, commonEmails: true, mktEmails: false },
      buildContext(userId, victimEmail),
    )

    expect(result).toMatchObject({
      success: false,
      errors: [{ message: participantCopy.terms.profileCreateFailed }],
    })
    const profiles = await kysely
      .selectFrom("profiles")
      .select(["id", "user_id"])
      .where("email", "=", victimEmail)
      .execute()
    expect(profiles).toEqual([{ id: victim.id, user_id: victimId }])
  })
})
