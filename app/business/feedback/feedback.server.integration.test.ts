import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  getAllFeedbacksWithVerification,
  getRecentFeedbacks,
  submitFeedback,
} from "./feedback.server"
import { createTestProfile } from "~/test/db-test-utils"

describe("Feedback Server - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    await kysely.deleteFrom("feedbacks").execute()
  })

  afterEach(async () => {
    await kysely.deleteFrom("feedbacks").execute()
    await cleanupAfterTest(tracker, kysely)
  })

  describe("submitFeedback", () => {
    it("should insert feedback into database", async () => {
      const feedbackData = {
        name: "João Silva",
        email: "joao@example.com",
        whatsapp: "11999999999",
        hasParticipated: "never" as const,
        feedbackText: "Este é um feedback de teste.",
        canContact: true,
      }

      await submitFeedback(feedbackData, "192.168.1.1")

      const feedbacks = await kysely
        .selectFrom("feedbacks")
        .selectAll()
        .execute()

      expect(feedbacks).toHaveLength(1)
      expect(feedbacks[0].name).toBe("João Silva")
      expect(feedbacks[0].email).toBe("joao@example.com")
      expect(feedbacks[0].whatsapp).toBe("11999999999")
      expect(feedbacks[0].has_participated).toBe("never")
      expect(feedbacks[0].feedback_text).toBe("Este é um feedback de teste.")
      expect(feedbacks[0].ip_address).toBe("192.168.1.1")
    })

    it("should store feedback with optional fields as null", async () => {
      const feedbackData = {
        hasParticipated: "once" as const,
        feedbackText: "Feedback sem contato.",
        canContact: false,
      }

      await submitFeedback(feedbackData, "192.168.1.2")

      const feedbacks = await kysely
        .selectFrom("feedbacks")
        .selectAll()
        .execute()

      expect(feedbacks).toHaveLength(1)
      expect(feedbacks[0].name).toBeNull()
      expect(feedbacks[0].email).toBeNull()
      expect(feedbacks[0].whatsapp).toBeNull()
    })
  })

  describe("getRecentFeedbacks", () => {
    it("should return recent feedbacks ordered by created_at desc", async () => {
      await kysely
        .insertInto("feedbacks")
        .values({
          name: "First",
          feedback_text: "First feedback",
          has_participated: "never",
          ip_address: "1.1.1.1",
        })
        .execute()

      await new Promise((resolve) => setTimeout(resolve, 10))

      await kysely
        .insertInto("feedbacks")
        .values({
          name: "Second",
          feedback_text: "Second feedback",
          has_participated: "once",
          ip_address: "2.2.2.2",
        })
        .execute()

      const result = await getRecentFeedbacks(10)

      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Expected success")
      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe("Second")
      expect(result.data[1].name).toBe("First")
    })

    it("should respect the limit parameter", async () => {
      await kysely
        .insertInto("feedbacks")
        .values([
          {
            name: "One",
            feedback_text: "Feedback 1",
            has_participated: "never",
            ip_address: "1.1.1.1",
          },
          {
            name: "Two",
            feedback_text: "Feedback 2",
            has_participated: "never",
            ip_address: "2.2.2.2",
          },
          {
            name: "Three",
            feedback_text: "Feedback 3",
            has_participated: "never",
            ip_address: "3.3.3.3",
          },
        ])
        .execute()

      const result = await getRecentFeedbacks(2)

      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Expected success")
      expect(result.data).toHaveLength(2)
    })
  })

  describe("getAllFeedbacksWithVerification", () => {
    it("should return all feedbacks with is_verified false when no matching profiles", async () => {
      await kysely
        .insertInto("feedbacks")
        .values({
          name: "Test User",
          email: "unknown@example.com",
          feedback_text: "Test feedback",
          has_participated: "never",
          ip_address: "1.1.1.1",
        })
        .execute()

      const result = await getAllFeedbacksWithVerification()

      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Expected success")
      expect(result.data).toHaveLength(1)
      expect(result.data[0].is_verified).toBe(false)
    })

    it("should set is_verified true when email matches a profile", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "verified@example.com",
      })
      tracker.track("profile", profile.id)

      await kysely
        .insertInto("feedbacks")
        .values({
          name: "Verified User",
          email: "verified@example.com",
          feedback_text: "Verified feedback",
          has_participated: "once",
          ip_address: "1.1.1.1",
        })
        .execute()

      const result = await getAllFeedbacksWithVerification()

      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Expected success")
      expect(result.data).toHaveLength(1)
      expect(result.data[0].is_verified).toBe(true)
    })

    it("should set is_verified true when phone matches a profile", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "user@example.com",
        phone: 11999999999,
      })
      tracker.track("profile", profile.id)

      await kysely
        .insertInto("feedbacks")
        .values({
          name: "Phone User",
          whatsapp: "11999999999",
          feedback_text: "Phone feedback",
          has_participated: "more_than_once",
          ip_address: "1.1.1.1",
        })
        .execute()

      const result = await getAllFeedbacksWithVerification()

      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Expected success")
      expect(result.data).toHaveLength(1)
      expect(result.data[0].is_verified).toBe(true)
    })
  })
})
