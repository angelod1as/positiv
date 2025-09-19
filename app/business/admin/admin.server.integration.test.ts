import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestEvent, createTestEventParticipant, createTestProfile } from "~/test/db-test-utils"
import { getParticipantFullEventHistory, updateEventParticipantById } from "./admin.server"

describe("getParticipantFullEventHistory - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    
    // Clear any existing event participants for test profiles
    // This ensures tests start with a clean slate
    const testEmails = ["user1@example.com", "user2@example.com", "user3@example.com", "user9@example.com"]
    
    const profiles = await kysely
      .selectFrom("profiles")
      .select("id")
      .where("email", "in", testEmails)
      .execute()
    
    if (profiles.length > 0) {
      const profileIds = profiles.map(p => p.id)
      await kysely
        .deleteFrom("event_participants")
        .where("profile_id", "in", profileIds)
        .execute()
    }
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return participant event history for a given profile", async () => {
    // Create a test profile for this test
    const profile = await createTestProfile(tracker, kysely, {
      user_id: crypto.randomUUID(),
      email: "test-history-user@example.com",
      full_name: "Test History User"
    })

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

  it("should return ALL registrations including admin-added participants", async () => {
    // This test verifies that getParticipantFullEventHistory returns ALL registrations,
    // not just those where is_user_applied = true (fixing POS-238)

    // Create a test profile
    const profile = await createTestProfile(tracker, kysely, {
      user_id: crypto.randomUUID(),
      email: "test-all-registrations@example.com",
      full_name: "Test All Registrations User"
    })

    const event1 = await createTestEvent(tracker, kysely, {
      title: "Event with User Application",
      emoji: "📝",
      location: "Location 1",
      description: "User applied themselves",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ticket_price: 100,
      total_spots: 50
    })

    const event2 = await createTestEvent(tracker, kysely, {
      title: "Event Admin Added",
      emoji: "👤",
      location: "Location 2",
      description: "Admin added participant",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      ticket_price: 150,
      total_spots: 30
    })

    const event3 = await createTestEvent(tracker, kysely, {
      title: "Event No Show",
      emoji: "❌",
      location: "Location 3",
      description: "User didn't attend",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      ticket_price: 100,
      total_spots: 40
    })

    // Create participants with different scenarios
    // 1. User applied and attended
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event1.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "attended",
      admin_general_notes: "Participated actively"
    })

    // 2. Admin added participant (is_user_applied = false) - THIS SHOULD BE INCLUDED
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event2.id,
      is_user_applied: false, // Admin added
      application_status: "finalised",
      attendance_status: "attended",
      admin_general_notes: "Admin added this person directly"
    })

    // 3. User applied but didn't attend - THIS SHOULD BE INCLUDED
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event3.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "not-attended",
      admin_general_notes: "Was interviewed but didn't show up"
    })

    // Test the function
    const result = await getParticipantFullEventHistory({
      profileId: profile.id,
      excludeEventId: undefined
    })

    expect(result).toHaveProperty("success", true)
    if (result.success) {
      // IMPORTANT: Should return ALL 3 registrations, not just where is_user_applied = true
      expect(result.data).toHaveLength(3)

      // Verify all events are included
      const eventTitles = result.data.map(e => e.event_title)
      expect(eventTitles).toContain("Event with User Application")
      expect(eventTitles).toContain("Event Admin Added")
      expect(eventTitles).toContain("Event No Show")

      // Verify admin notes are preserved even for no-shows
      const noShowEvent = result.data.find(e => e.event_title === "Event No Show")
      expect(noShowEvent?.admin_general_notes).toBe("Was interviewed but didn't show up")

      // Verify admin-added participant is included
      const adminAddedEvent = result.data.find(e => e.event_title === "Event Admin Added")
      expect(adminAddedEvent?.admin_general_notes).toBe("Admin added this person directly")
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

describe("updateEventParticipantById - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    // Clear existing test data
    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb.selectFrom("profiles").select("id").where("email", "like", "test-flag-%")
      )
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should update event participant fields when participant has flag set", async () => {
    // Create test data
    const profile = await createTestProfile(tracker, kysely, {
      user_id: crypto.randomUUID(),
      email: "test-flag-participant@example.com",
      full_name: "Test Flag Participant",
      flag: "yellow",
      flag_notes: "Test warning note"
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event with Flags",
      time_event_start: new Date().toISOString()
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      payment: 100,
      attendance_status: "pending"
    })

    // Test updating payment field when participant has flag
    const result = await updateEventParticipantById({
      id: participant.id,
      profile_id: profile.id,
      intent: "update-event-participant",
      payment: 150
    })

    expect(result.success).toBe(true)

    // Verify the update
    const updatedParticipant = await kysely
      .selectFrom("event_participants")
      .selectAll()
      .where("id", "=", participant.id)
      .executeTakeFirst()

    expect(updatedParticipant?.payment).toBe("150.00")
  })

  it("should fail when updating participant with flag but without flag_notes", async () => {
    // Create test data
    const profile = await createTestProfile(tracker, kysely, {
      user_id: crypto.randomUUID(),
      email: "test-flag-fail@example.com",
      full_name: "Test Flag Fail",
      flag: "none"
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event Flag Fail",
      time_event_start: new Date().toISOString()
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true
    })

    // Test updating flag without flag_notes
    const result = await updateEventParticipantById({
      id: participant.id,
      profile_id: profile.id,
      intent: "update-event-participant",
      flag: "yellow"
    })

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should successfully update attendance_status for participant with existing flag", async () => {
    // Create test data with flag
    const profile = await createTestProfile(tracker, kysely, {
      user_id: crypto.randomUUID(),
      email: "test-attendance-flag@example.com",
      full_name: "Test Attendance Flag",
      flag: "red",
      flag_notes: "Important participant note"
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event Attendance",
      time_event_start: new Date().toISOString()
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      attendance_status: "pending"
    })

    // Test updating attendance_status only
    const result = await updateEventParticipantById({
      id: participant.id,
      profile_id: profile.id,
      intent: "update-event-participant",
      attendance_status: "attended"
    })

    // This used to fail but now should succeed with the fix
    expect(result.success).toBe(true)

    // Verify the update
    const updatedParticipant = await kysely
      .selectFrom("event_participants")
      .selectAll()
      .where("id", "=", participant.id)
      .executeTakeFirst()

    expect(updatedParticipant?.attendance_status).toBe("attended")
  })
})