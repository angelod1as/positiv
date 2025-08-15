import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile, createTestEvent } from "~/test/db-test-utils"
import { getEligibleRecipients, type SegmentFilter } from "./newsletter-recipients.server"

describe("Advanced Segmentation Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    
    // Clear existing test data more thoroughly
    await kysely.deleteFrom("event_participants").execute()
    await kysely.deleteFrom("events").execute()
    await kysely.deleteFrom("profiles")
      .where("email", "like", "%@test.com")
      .execute()
    
    // Also clear any profiles created in the test that might have been missed
    await kysely.deleteFrom("profiles")
      .where("email", "in", [
        "active@test.com",
        "inactive@test.com",
        "never@test.com",
        "recent@test.com",
        "old@test.com",
        "frequent@test.com",
        "occasional@test.com",
        "onetime@test.com",
        "multi@test.com",
        "lapsed@test.com",
        "stillactive@test.com",
        "veteran-active@test.com",
        "newbie-never@test.com",
        "veteran-inactive@test.com"
      ])
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("Inactive Users Filter", () => {
    it("should filter profiles that attended > 6 months ago", async () => {
      // Create profiles
      const activeProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "active@test.com",
        full_name: "Active User",
        allow_marketing_email: true,
      })
      
      const inactiveProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "inactive@test.com",
        full_name: "Inactive User",
        allow_marketing_email: true,
      })
      
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "never@test.com",
        full_name: "Never Attended",
        allow_marketing_email: true,
      })
      
      // Create events
      const recentEvent = await createTestEvent(tracker, kysely, {
        title: "Recent Event",
        time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      })
      
      const oldEvent = await createTestEvent(tracker, kysely, {
        title: "Old Event",
        time_event_start: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // 200 days ago
      })
      
      // Create attendance records
      await kysely.insertInto("event_participants").values([
        {
          profile_id: activeProfile.id,
          event_id: recentEvent.id,
          attendance_status: "attended",
          application_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          profile_id: inactiveProfile.id,
          event_id: oldEvent.id,
          attendance_status: "attended",
          application_date: new Date(Date.now() - 205 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]).execute()
      
      const filter: SegmentFilter = {
        activityStatus: "inactive",
        inactivityPeriodDays: 180,
      }
      
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("inactive@test.com")
    })
  })

  describe("Recent Attendees Filter", () => {
    it("should filter profiles that attended in the last 3 months", async () => {
      // Create profiles
      const recentProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "recent@test.com",
        full_name: "Recent User",
        allow_marketing_email: true,
      })
      
      const oldProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "old@test.com",
        full_name: "Old User",
        allow_marketing_email: true,
      })
      
      // Create events
      const recentEvent = await createTestEvent(tracker, kysely, {
        title: "Recent Event",
        time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      })
      
      const oldEvent = await createTestEvent(tracker, kysely, {
        title: "Old Event",
        time_event_start: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
      })
      
      // Create attendance records
      await kysely.insertInto("event_participants").values([
        {
          profile_id: recentProfile.id,
          event_id: recentEvent.id,
          attendance_status: "attended",
          application_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          profile_id: oldProfile.id,
          event_id: oldEvent.id,
          attendance_status: "attended",
          application_date: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]).execute()
      
      const filter: SegmentFilter = {
        activityStatus: "recent",
      }
      
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("recent@test.com")
    })
  })

  describe("Attendance Count Filters", () => {
    it("should filter frequent attendees (3+ events)", async () => {
      // Create profiles
      const frequentProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "frequent@test.com",
        full_name: "Frequent User",
        allow_marketing_email: true,
      })
      
      const occasionalProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "occasional@test.com",
        full_name: "Occasional User",
        allow_marketing_email: true,
      })
      
      // Create events
      const events = await Promise.all([
        createTestEvent(tracker, kysely, { title: "Event 1" }),
        createTestEvent(tracker, kysely, { title: "Event 2" }),
        createTestEvent(tracker, kysely, { title: "Event 3" }),
        createTestEvent(tracker, kysely, { title: "Event 4" }),
      ])
      
      // Frequent user attended 4 events
      await kysely.insertInto("event_participants").values(
        events.map(event => ({
          profile_id: frequentProfile.id,
          event_id: event.id,
          attendance_status: "attended" as const,
          application_date: new Date().toISOString(),
        }))
      ).execute()
      
      // Occasional user attended 2 events
      await kysely.insertInto("event_participants").values([
        {
          profile_id: occasionalProfile.id,
          event_id: events[0].id,
          attendance_status: "attended" as const,
          application_date: new Date().toISOString(),
        },
        {
          profile_id: occasionalProfile.id,
          event_id: events[1].id,
          attendance_status: "attended" as const,
          application_date: new Date().toISOString(),
        },
      ]).execute()
      
      const filter: SegmentFilter = {
        eventAttendanceCount: {
          min: 3,
        },
      }
      
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("frequent@test.com")
      expect(recipients[0].attendance_count).toBe(4)
    })

    it("should filter one-time attendees", async () => {
      // Create profiles
      const oneTimeProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "onetime@test.com",
        full_name: "One Time User",
        allow_marketing_email: true,
      })
      
      const multiProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "multi@test.com",
        full_name: "Multi User",
        allow_marketing_email: true,
      })
      
      // Create events
      const event1 = await createTestEvent(tracker, kysely, { title: "Event 1" })
      const event2 = await createTestEvent(tracker, kysely, { title: "Event 2" })
      
      // One-time user attended 1 event
      await kysely.insertInto("event_participants").values({
        profile_id: oneTimeProfile.id,
        event_id: event1.id,
        attendance_status: "attended",
        application_date: new Date().toISOString(),
      }).execute()
      
      // Multi user attended 2 events
      await kysely.insertInto("event_participants").values([
        {
          profile_id: multiProfile.id,
          event_id: event1.id,
          attendance_status: "attended" as const,
          application_date: new Date().toISOString(),
        },
        {
          profile_id: multiProfile.id,
          event_id: event2.id,
          attendance_status: "attended" as const,
          application_date: new Date().toISOString(),
        },
      ]).execute()
      
      const filter: SegmentFilter = {
        eventAttendanceCount: {
          exact: 1,
        },
      }
      
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("onetime@test.com")
      expect(recipients[0].attendance_count).toBe(1)
    })
  })

  describe("Lapsed Users Filter", () => {
    it("should filter previously active users who haven't attended recently", async () => {
      // Create profiles
      const lapsedProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "lapsed@test.com",
        full_name: "Lapsed User",
        allow_marketing_email: true,
      })
      
      const activeProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "stillactive@test.com",
        full_name: "Still Active",
        allow_marketing_email: true,
      })
      
      // Create events
      const oldEvents = await Promise.all([
        createTestEvent(tracker, kysely, {
          title: "Old Event 1",
          time_event_start: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000),
        }),
        createTestEvent(tracker, kysely, {
          title: "Old Event 2",
          time_event_start: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000),
        }),
        createTestEvent(tracker, kysely, {
          title: "Old Event 3",
          time_event_start: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        }),
      ])
      
      const recentEvent = await createTestEvent(tracker, kysely, {
        title: "Recent Event",
        time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      
      // Lapsed user attended 3 old events
      await kysely.insertInto("event_participants").values(
        oldEvents.map(event => ({
          profile_id: lapsedProfile.id,
          event_id: event.id,
          attendance_status: "attended" as const,
          application_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
        }))
      ).execute()
      
      // Active user attended old events AND recent event
      await kysely.insertInto("event_participants").values([
        ...oldEvents.map(event => ({
          profile_id: activeProfile.id,
          event_id: event.id,
          attendance_status: "attended" as const,
          application_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
        })),
        {
          profile_id: activeProfile.id,
          event_id: recentEvent.id,
          attendance_status: "attended" as const,
          application_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]).execute()
      
      const filter: SegmentFilter = {
        activityStatus: "lapsed",
        inactivityPeriodDays: 180,
      }
      
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("lapsed@test.com")
    })
  })

  describe("Combined Filters", () => {
    it("should combine veteran filter with activity filters", async () => {
      // Create profiles
      // Note: The database trigger automatically sets is_veteran=true when someone attends an event
      const veteranActive = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "veteran-active@test.com",
        full_name: "Veteran Active",
        is_veteran: true,
        allow_marketing_email: true,
      })
      
      // This will remain a newbie since they won't attend any events
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "newbie-never@test.com",
        full_name: "Newbie Never Attended",
        is_veteran: false,
        allow_marketing_email: true,
      })
      
      const veteranInactive = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "veteran-inactive@test.com",
        full_name: "Veteran Inactive",
        is_veteran: true,
        allow_marketing_email: true,
      })
      
      // Create events
      const recentEvent = await createTestEvent(tracker, kysely, {
        title: "Recent Event",
        time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      
      const oldEvent = await createTestEvent(tracker, kysely, {
        title: "Old Event",
        time_event_start: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      })
      
      // Create attendance records
      await kysely.insertInto("event_participants").values([
        {
          profile_id: veteranActive.id,
          event_id: recentEvent.id,
          attendance_status: "attended",
          application_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          profile_id: veteranInactive.id,
          event_id: oldEvent.id,
          attendance_status: "attended",
          application_date: new Date(Date.now() - 205 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]).execute()
      
      // Note: newbieNeverAttended doesn't attend any events, so remains a newbie
      
      const filter: SegmentFilter = {
        veteransOnly: true,
        activityStatus: "recent",
      }
      
      const recipients = await getEligibleRecipients(kysely, filter)
      
      // Should only get the veteran who attended recently
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("veteran-active@test.com")
    })
  })
})