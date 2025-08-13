import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile, createTestEvent } from "~/test/db-test-utils"
import {
  getEligibleRecipients,
  type SegmentFilter,
} from "./newsletter-recipients.server"

describe("Newsletter Recipients - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    // Clear existing test data
    await kysely.deleteFrom("profiles").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("getEligibleRecipients", () => {
    it("should return only profiles with allow_marketing_email = true", async () => {
      // Create test profiles
      const allowedProfile1 = await createTestProfile(tracker, kysely, {
        email: "allowed1@test.com",
        allow_marketing_email: true,
      })
      const allowedProfile2 = await createTestProfile(tracker, kysely, {
        email: "allowed2@test.com",
        allow_marketing_email: true,
      })
      const notAllowedProfile = await createTestProfile(tracker, kysely, {
        email: "notallowed@test.com",
        allow_marketing_email: false,
      })

      const recipients = await getEligibleRecipients(kysely)

      expect(recipients).toHaveLength(2)
      expect(recipients.map(r => r.email)).toContain("allowed1@test.com")
      expect(recipients.map(r => r.email)).toContain("allowed2@test.com")
      expect(recipients.map(r => r.email)).not.toContain("notallowed@test.com")
    })

    it("should filter by veteran status", async () => {
      await createTestProfile(tracker, kysely, {
        email: "veteran@test.com",
        allow_marketing_email: true,
        is_veteran: true,
      })
      await createTestProfile(tracker, kysely, {
        email: "newbie@test.com",
        allow_marketing_email: true,
        is_veteran: false,
      })

      const veteranFilter: SegmentFilter = { veteransOnly: true }
      const veteranRecipients = await getEligibleRecipients(kysely, veteranFilter)

      expect(veteranRecipients).toHaveLength(1)
      expect(veteranRecipients[0].email).toBe("veteran@test.com")

      const newbieFilter: SegmentFilter = { newbiesOnly: true }
      const newbieRecipients = await getEligibleRecipients(kysely, newbieFilter)

      expect(newbieRecipients).toHaveLength(1)
      expect(newbieRecipients[0].email).toBe("newbie@test.com")
    })

    it("should filter by gender", async () => {
      await createTestProfile(tracker, kysely, {
        email: "male@test.com",
        allow_marketing_email: true,
        gender: ["Male"],
      })
      await createTestProfile(tracker, kysely, {
        email: "female@test.com",
        allow_marketing_email: true,
        gender: ["Female"],
      })
      await createTestProfile(tracker, kysely, {
        email: "nonbinary@test.com",
        allow_marketing_email: true,
        gender: ["Non-binary"],
      })

      const maleFilter: SegmentFilter = { gender: "Male" }
      const maleRecipients = await getEligibleRecipients(kysely, maleFilter)

      expect(maleRecipients).toHaveLength(1)
      expect(maleRecipients[0].email).toBe("male@test.com")
    })

    it("should filter by orientation", async () => {
      await createTestProfile(tracker, kysely, {
        email: "gay@test.com",
        allow_marketing_email: true,
        orientation: ["Gay"],
      })
      await createTestProfile(tracker, kysely, {
        email: "bi@test.com",
        allow_marketing_email: true,
        orientation: ["Bisexual"],
      })

      const gayFilter: SegmentFilter = { orientation: "Gay" }
      const gayRecipients = await getEligibleRecipients(kysely, gayFilter)

      expect(gayRecipients).toHaveLength(1)
      expect(gayRecipients[0].email).toBe("gay@test.com")
    })

    it("should combine multiple filters", async () => {
      await createTestProfile(tracker, kysely, {
        email: "veteran-male@test.com",
        allow_marketing_email: true,
        is_veteran: true,
        gender: ["Male"],
      })
      await createTestProfile(tracker, kysely, {
        email: "newbie-male@test.com",
        allow_marketing_email: true,
        is_veteran: false,
        gender: ["Male"],
      })
      await createTestProfile(tracker, kysely, {
        email: "veteran-female@test.com",
        allow_marketing_email: true,
        is_veteran: true,
        gender: ["Female"],
      })

      const combinedFilter: SegmentFilter = {
        veteransOnly: true,
        gender: "Male",
      }
      const combinedRecipients = await getEligibleRecipients(kysely, combinedFilter)

      expect(combinedRecipients).toHaveLength(1)
      expect(combinedRecipients[0].email).toBe("veteran-male@test.com")
    })

    it("should return empty array when no profiles match", async () => {
      await createTestProfile(tracker, kysely, {
        email: "test@test.com",
        allow_marketing_email: false,
      })

      const recipients = await getEligibleRecipients(kysely)

      expect(recipients).toHaveLength(0)
    })

    it("should handle null/undefined filters gracefully", async () => {
      await createTestProfile(tracker, kysely, {
        email: "test@test.com",
        allow_marketing_email: true,
      })

      const recipients = await getEligibleRecipients(kysely, undefined)

      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("test@test.com")
    })
  })

  describe("getRecipientCount", () => {
    it("should return count of eligible recipients", async () => {
      await createTestProfile(tracker, kysely, {
        email: "test1@test.com",
        allow_marketing_email: true,
      })
      await createTestProfile(tracker, kysely, {
        email: "test2@test.com",
        allow_marketing_email: true,
      })
      await createTestProfile(tracker, kysely, {
        email: "test3@test.com",
        allow_marketing_email: false,
      })

      const { getRecipientCount } = await import("./newsletter-recipients.server")
      const count = await getRecipientCount(kysely)

      expect(count).toBe(2)
    })

    it("should return count with filters applied", async () => {
      await createTestProfile(tracker, kysely, {
        email: "veteran1@test.com",
        allow_marketing_email: true,
        is_veteran: true,
      })
      await createTestProfile(tracker, kysely, {
        email: "veteran2@test.com",
        allow_marketing_email: true,
        is_veteran: true,
      })
      await createTestProfile(tracker, kysely, {
        email: "newbie@test.com",
        allow_marketing_email: true,
        is_veteran: false,
      })

      const { getRecipientCount } = await import("./newsletter-recipients.server")
      const filter: SegmentFilter = { veteransOnly: true }
      const count = await getRecipientCount(kysely, filter)

      expect(count).toBe(2)
    })
  })
})