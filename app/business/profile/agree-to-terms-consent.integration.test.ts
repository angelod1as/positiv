import type { z } from "zod"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { contextSchema } from "~/business/auth/auth-schemas"
import { createTestAuthUser } from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { sessionClientThatThrows } from "~/test/session-client-that-throws"
import { agreeToTerms } from "./agree-to-terms.server"

describe("agreeToTerms email consent - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const consentOf = (profileId: string) =>
    kysely
      .selectFrom("email_consents")
      .selectAll()
      .where("profile_id", "=", profileId)
      .executeTakeFirstOrThrow()

  describe("a refusal at signup", () => {
    it("should be recorded as a no, dated, when there was no subscription before", async () => {
      const email = `web51-refusal-${Date.now()}@example.com`
      const userId = await createTestAuthUser(email, "test1234", tracker)
      const context: z.infer<typeof contextSchema> = {
        supabase: sessionClientThatThrows("agreeToTerms") as z.infer<
          typeof contextSchema
        >["supabase"],
        supabaseHeaders: new Headers(),
        currentUser: { id: userId, email },
        currentProfile: null,
        isProdInDev: false,
        host: "localhost",
      }

      const result = await agreeToTerms(
        { agree: true, commonEmails: true, mktEmails: false },
        context,
      )
      expect(result).toMatchObject({ success: true })

      const profile = await kysely
        .selectFrom("profiles")
        .select("id")
        .where("user_id", "=", userId)
        .executeTakeFirstOrThrow()
      tracker.track("profiles", profile.id)

      const consent = await consentOf(profile.id)
      expect(consent.newsletter).toBe(false)
      expect(consent.newsletter_at).toEqual(expect.any(Date))
    })
  })
})
