import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestEvent, createTestEventParticipant } from "~/test/db-test-utils"
import { getParticipantFullEventHistory } from "./admin.server"

describe("getParticipantFullEventHistory - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    
    // Clear any existing event participants for test profiles
    // This ensures tests start with a clean slate
    const testEmails = ["user1@example.com", "user2@example.com", "user3@example.com", "user9@example.com"]
    
    for (const email of testEmails) {
      const profile = await kysely
        .selectFrom("profiles")
        .select("id")
        .where("email", "=", email)
        .executeTakeFirst()
      
      if (profile) {
        await kysely
          .deleteFrom("event_participants")
          .where("profile_id", "=", profile.id)
          .execute()
      }
    }
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return participant event history for a given profile", async () => {
    // Get existing profile from seeded data
    const profile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("email", "=", "user9@example.com")
      .executeTakeFirst()
    
      
    if (!profile) {
      throw new Error("Test profile not found. Make sure database is seeded.")
    }

    // Track the profile for cleanup if we make changes to it
    tracker.track("profiles", profile.id)

    const event1 = await createTestEvent(tracker, kysely, {
      title: "Test Event 1",
      emoji: "🎉",
      location: "Test Location 1",
      description: "Test Description 1",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      ticket_price: 100,
      total_spots: 50
    })

    const event2 = await createTestEvent(tracker, kysely, {
      title: "Test Event 2",
      emoji: "🎭",
      location: "Test Location 2",
      description: "Test Description 2",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(Date.now() + 44 * 24 * 60 * 60 * 1000).toISOString(),
      ticket_price: 150,
      total_spots: 30
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event1.id,
      application_status: "finalised",
      attendance_status: "attended",
      admin_general_notes: "Test notes for event 1"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event2.id,
      application_status: "finalised",
      attendance_status: "not-attended"
    })

    // Test the function
    const result = await getParticipantFullEventHistory({
      profileId: profile.id,
      excludeEventId: undefined
    })

    expect(result).toHaveProperty("success", true)
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data).toHaveLength(2)
      
      // Verify the structure of returned data
      const firstEvent = result.data[0]
      expect(firstEvent).toHaveProperty("id")
      expect(firstEvent).toHaveProperty("profile_id", profile.id)
      expect(firstEvent).toHaveProperty("event_id")
      expect(firstEvent).toHaveProperty("event_title")
      expect(firstEvent).toHaveProperty("event_emoji")
      expect(firstEvent).toHaveProperty("time_event_start")
      expect(firstEvent).toHaveProperty("application_status", "finalised")
      expect(firstEvent).toHaveProperty("attendance_status")
      expect(firstEvent).toHaveProperty("admin_general_notes")
    }
  })

  it("should exclude the current event from history", async () => {
    // Get existing profile from seeded data
    const profile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("email", "=", "user1@example.com")
      .executeTakeFirst()
      
    if (!profile) {
      throw new Error("Test profile not found. Make sure database is seeded.")
    }

    // Track the profile for cleanup if we make changes to it
    tracker.track("profiles", profile.id)

    const event1 = await createTestEvent(tracker, kysely, {
      title: "Event to Include",
      emoji: "✅",
      location: "Location 1",
      description: "Description 1",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      ticket_price: 100,
      total_spots: 50
    })

    const eventToExclude = await createTestEvent(tracker, kysely, {
      title: "Event to Exclude",
      emoji: "❌",
      location: "Location 2",
      description: "Description 2",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(Date.now() + 44 * 24 * 60 * 60 * 1000).toISOString(),
      ticket_price: 150,
      total_spots: 30
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event1.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: eventToExclude.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    const result = await getParticipantFullEventHistory({
      profileId: profile.id,
      excludeEventId: eventToExclude.id
    })

    if (result.success) {
      expect(result.data).toHaveLength(1)
      const hasExcludedEvent = result.data.some(
        (event) => event.event_id === eventToExclude.id
      )
      expect(hasExcludedEvent).toBe(false)
      expect(result.data[0].event_title).toBe("Event to Include")
    }
  })

  it("should order events by date descending (most recent first)", async () => {
    // Get existing profile from seeded data
    const profile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("email", "=", "user2@example.com")
      .executeTakeFirst()
      
    if (!profile) {
      throw new Error("Test profile not found. Make sure database is seeded.")
    }

    // Track the profile for cleanup if we make changes to it
    tracker.track("profiles", profile.id)

    // Create events with different dates
    const olderEvent = await createTestEvent(tracker, kysely, {
      title: "Older Event",
      emoji: "📅",
      location: "Location 1",
      description: "Description 1",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      time_event_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      ticket_price: 100,
      total_spots: 50
    })

    const newerEvent = await createTestEvent(tracker, kysely, {
      title: "Newer Event",
      emoji: "🆕",
      location: "Location 2",
      description: "Description 2",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      ticket_price: 150,
      total_spots: 30
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: olderEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: newerEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    const result = await getParticipantFullEventHistory({
      profileId: profile.id,
      excludeEventId: undefined
    })

    if (result.success && result.data.length > 1) {
      // Check that events are ordered by date descending
      expect(result.data[0].event_title).toBe("Newer Event")
      expect(result.data[1].event_title).toBe("Older Event")
      
      for (let i = 0; i < result.data.length - 1; i++) {
        const currentDate = new Date(result.data[i].time_event_start)
        const nextDate = new Date(result.data[i + 1].time_event_start)
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
      }
    }
  })

  it("should handle profile with no event history", async () => {
    // Get existing profile from seeded data
    const profile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("email", "=", "user3@example.com")
      .executeTakeFirst()
      
    if (!profile) {
      throw new Error("Test profile not found. Make sure database is seeded.")
    }

    // Track the profile for cleanup if we make changes to it
    tracker.track("profiles", profile.id)

    const result = await getParticipantFullEventHistory({
      profileId: profile.id,
      excludeEventId: undefined
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(0)
    }
  })
})