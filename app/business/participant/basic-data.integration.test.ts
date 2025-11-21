import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile, getTestSupabaseClient } from "~/test/db-test-utils"
import { extraBasicData } from "./basic-data.server"
import { subscribeProfileToNewsletter } from "../newsletter/auto-subscribe.server"
import * as listmonkClient from "../newsletter/listmonk-client.server"

describe("Basic Data Newsletter Re-sync - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const supabase = getTestSupabaseClient()

  beforeEach(async () => {
    tracker.clear()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
    vi.restoreAllMocks()
  })

  describe("Newsletter re-sync when basic data is filled", () => {
    it("should re-sync newsletter with real name when profile completes basic data", async () => {
      const addSubscriberSpy = vi.spyOn(listmonkClient, "addSubscriber")
      addSubscriberSpy.mockResolvedValue({ success: true, data: undefined, errors: [] })

      const email = "test-newsletter-resync@example.com"

      // Create profile with null full_name and social_name (simulating incomplete profile)
      const profile = await createTestProfile(tracker, kysely, {
        email,
        user_id: null,
        full_name: null,
        social_name: null,
        is_veteran: false,
        approved_to_attend: "pending",
        phone: 11999999999,
        rg: "123456789",
        rg_issuer: "SSP",
        cpf: "12345678901",
        date_of_birth: "1990-01-01",
        gender: ["Mulher cisgênero"],
        orientation: ["Lésbica"],
        pronouns: ["Ela/Dela"],
        race_color: ["Preta"],
      })

      // Subscribe to newsletter (simulating user opted in during agree-to-terms)
      // This will call addSubscriber with email as name since full_name is null
      await subscribeProfileToNewsletter(profile.id, "terms_and_conditions")

      // Verify initial sync used email as name
      expect(addSubscriberSpy).toHaveBeenCalledOnce()
      const initialCallArgs = addSubscriberSpy.mock.calls[0][0]
      expect(initialCallArgs.name).toBe(email)

      addSubscriberSpy.mockClear()

      // Now fill in the basic data (including full_name)
      const formData = {
        gender: ["Mulher cisgênero"],
        orientation: ["Lésbica"],
        pronouns: ["Ela/Dela"],
        race_color: ["Preta"],
      }

      // First update the profile with full_name (simulating the basicData step)
      await kysely
        .updateTable("profiles")
        .set({
          full_name: "Maria Silva",
        })
        .where("id", "=", profile.id)
        .execute()

      // Fetch updated profile for context
      const updatedProfile = await kysely
        .selectFrom("profiles")
        .selectAll()
        .where("id", "=", profile.id)
        .executeTakeFirstOrThrow()

      // Then call extraBasicData to set basic_data_filled = true
      // This will throw a redirect response, which is expected behavior
      try {
        await extraBasicData({
          formData,
          context: {
            supabase,
            supabaseHeaders: new Headers(),
            currentUser: null,
            currentProfile: {
              ...updatedProfile,
              is_admin: false,
              basic_data_filled: false,
              created_at: updatedProfile.created_at || new Date().toISOString(),
              date_of_birth: updatedProfile.date_of_birth
                ? typeof updatedProfile.date_of_birth === "string"
                  ? updatedProfile.date_of_birth
                  : new Date(updatedProfile.date_of_birth).toISOString().split('T')[0]
                : "1990-01-01",
              how_came_to_us: updatedProfile.how_came_to_us || undefined,
              where_lives: updatedProfile.where_lives || undefined,
            },
            isProdInDev: false,
            host: null,
          },
        })
      } catch (redirectOrError) {
        // Catch the redirect response - this is expected
        // If it's an error, log it for debugging
        if (redirectOrError instanceof Error) {
          console.error("Unexpected error:", redirectOrError.message)
          throw redirectOrError
        }
        expect(redirectOrError).toHaveProperty("status", 302)
      }

      // Assert that addSubscriber was called again to re-sync
      // (This test should FAIL initially because the re-sync functionality doesn't exist yet)
      expect(addSubscriberSpy).toHaveBeenCalledOnce()

      // Assert it was called with the real name (Maria), not the email
      const callArgs = addSubscriberSpy.mock.calls[0][0]
      expect(callArgs.name).toBe("Maria")
      expect(callArgs.attributes.full_name).toBe("Maria Silva")
      expect(callArgs.attributes.name).toBe("Maria")
    })
  })
})
