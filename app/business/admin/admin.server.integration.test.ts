import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestEvent, createTestEventParticipant, createTestProfile } from "~/test/db-test-utils"
import {
  getParticipantFullEventHistory,
  updateEventParticipantById,
  getProfileWithExtraDataById,
  getEventParticipantHistoryById,
  getProfilesWithExtraDataById,
  getEventsForDashboard,
  getAllProfiles,
  getProfileById
} from "./admin.server"

describe("getParticipantFullEventHistory - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    
    // Clear any existing event participants for test profiles
    // This ensures tests start with a clean slate
    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb.selectFrom("profiles").select("id").where("email", "like", "test-%")
      )
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return participant event history for a given profile", async () => {
    // Create a test profile for this test
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
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
      user_id: null,
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
    // Create a test profile instead of relying on seeded data
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-exclude-event@example.com",
      full_name: "Test Exclude Event User"
    })

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
    // Create a test profile instead of relying on seeded data
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-order-events@example.com",
      full_name: "Test Order Events User"
    })

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
    // Create a test profile instead of relying on seeded data
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-no-events@example.com",
      full_name: "Test No Events User"
    })

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

describe("getProfileWithExtraDataById - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()

    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb.selectFrom("profiles").select("id").where("email", "like", "test-%")
      )
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should fetch profile data using profileId and eventId", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-profile-lookup@example.com",
      full_name: "Test Profile Lookup"
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event for Profile",
      emoji: "🔍",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "pending"
    })

    const result = await getProfileWithExtraDataById({
      profileId: profile.id,
      eventId: event.id
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeDefined()
      expect(result.data.profile_id).toBe(profile.id)
      expect(result.data.event_id).toBe(event.id)
      expect(result.data.full_name).toBe("Test Profile Lookup")
    }
  })

  it("should return error when profile has no registration for event", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-no-registration@example.com",
      full_name: "Test No Registration"
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event No Registration",
      emoji: "❌",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50
    })

    const result = await getProfileWithExtraDataById({
      profileId: profile.id,
      eventId: event.id
    })

    expect(result.success).toBe(false)
  })
})

describe("getEventParticipantHistoryById - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()

    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb.selectFrom("profiles").select("id").where("email", "like", "test-%")
      )
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should fetch event participant history using profileId and eventId", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-history-lookup@example.com",
      full_name: "Test History Lookup"
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event History",
      emoji: "📜",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "attended",
      admin_general_notes: "Great participant"
    })

    const result = await getEventParticipantHistoryById({
      profileId: profile.id,
      eventId: event.id
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].profile_id).toBe(profile.id)
      expect(result.data[0].event_id).toBe(event.id)
      expect(result.data[0].event_title).toBe("Test Event History")
      expect(result.data[0].admin_general_notes).toBe("Great participant")
    }
  })

  it("should return empty array when profile has no registration for event", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-no-history@example.com",
      full_name: "Test No History"
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event No History",
      emoji: "🚫",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50
    })

    const result = await getEventParticipantHistoryById({
      profileId: profile.id,
      eventId: event.id
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
      user_id: null,
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
      user_id: null,
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
      user_id: null,
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

  it("should create and update profile with gray flag successfully", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-flag-gray@example.com",
      full_name: "Test Gray Flag",
      flag: "gray",
      flag_notes: "Previously had red flag for behavior in 2023. Cleared after 1 year of good behavior."
    })

    expect(profile.flag).toBe("gray")
    expect(profile.flag_notes).toContain("Previously had red flag")

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event Gray Flag",
      time_event_start: new Date().toISOString()
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      payment: 100,
      attendance_status: "pending"
    })

    const result = await updateEventParticipantById({
      id: participant.id,
      profile_id: profile.id,
      intent: "update-event-participant",
      payment: 150,
      flag: "gray",
      flag_notes: "Previously had red flag for behavior in 2023. Cleared after 1 year of good behavior."
    })

    expect(result.success).toBe(true)

    const updatedProfile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profile.id)
      .executeTakeFirst()

    expect(updatedProfile?.flag).toBe("gray")
    expect(updatedProfile?.flag_notes).toContain("Previously had red flag")
  })

  it("should require flag_notes when setting gray flag", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-flag-gray-validation@example.com",
      full_name: "Test Gray Flag No Notes",
      flag: "none"
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event Gray Flag Validation",
      time_event_start: new Date().toISOString()
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true
    })

    const result = await updateEventParticipantById({
      id: participant.id,
      profile_id: profile.id,
      intent: "update-event-participant",
      flag: "gray"
    })

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })
})

describe("getProfilesWithExtraDataById - Event Count and Last Event - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()

    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb.selectFrom("profiles").select("id").where("email", "like", "test-event-count-%")
      )
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should calculate attended events count excluding current event", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-event-count-1@example.com",
      full_name: "Test Event Count User"
    })

    const completedEvent1 = await createTestEvent(tracker, kysely, {
      title: "Completed Event 1",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    })

    const completedEvent2 = await createTestEvent(tracker, kysely, {
      title: "Completed Event 2",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Event",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: completedEvent1.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: completedEvent2.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: currentEvent.id,
      application_status: "finalised",
      attendance_status: "pending"
    })

    const result = await getProfilesWithExtraDataById({ eventId: currentEvent.id })

    expect(result).toHaveProperty("success", true)
    if (result.success) {
      const participant = result.data.find(p => p.profile_id === profile.id)
      expect(participant).toBeDefined()
      expect(participant?.attended_events_count).toBe(2)
    }
  })

  it("should exclude cancelled events from count", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-event-count-cancelled@example.com",
      full_name: "Test Cancelled Events"
    })

    const completedEvent = await createTestEvent(tracker, kysely, {
      title: "Completed Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    })

    const cancelledEvent = await createTestEvent(tracker, kysely, {
      title: "Cancelled Event",
      event_status: "Cancelled",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Event",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: completedEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: cancelledEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: currentEvent.id,
      application_status: "pending",
      attendance_status: "pending"
    })

    const result = await getProfilesWithExtraDataById({ eventId: currentEvent.id })

    if (result.success) {
      const participant = result.data.find(p => p.profile_id === profile.id)
      expect(participant?.attended_events_count).toBe(1)
    }
  })

  it("should only count attended and finalised events", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-event-count-status@example.com",
      full_name: "Test Event Status"
    })

    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Event",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    const attendedEvent = await createTestEvent(tracker, kysely, {
      title: "Attended Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    })

    const notAttendedEvent = await createTestEvent(tracker, kysely, {
      title: "Not Attended Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: attendedEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: notAttendedEvent.id,
      application_status: "finalised",
      attendance_status: "not-attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: currentEvent.id,
      application_status: "pending",
      attendance_status: "pending"
    })

    const result = await getProfilesWithExtraDataById({ eventId: currentEvent.id })

    if (result.success) {
      const participant = result.data.find(p => p.profile_id === profile.id)
      expect(participant?.attended_events_count).toBe(1)
    }
  })

  it("should return most recent attended event as last event", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-last-event@example.com",
      full_name: "Test Last Event"
    })

    const olderEvent = await createTestEvent(tracker, kysely, {
      title: "Older Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    })

    const recentEvent = await createTestEvent(tracker, kysely, {
      title: "Most Recent Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Event",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: olderEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: recentEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: currentEvent.id,
      application_status: "pending",
      attendance_status: "pending"
    })

    const result = await getProfilesWithExtraDataById({ eventId: currentEvent.id })

    if (result.success) {
      const participant = result.data.find(p => p.profile_id === profile.id)
      expect(participant?.last_attended_event_title).toBe("Most Recent Event")
      expect(participant?.last_attended_event_date).toBeDefined()
      expect(participant?.last_attended_event_id).toBe(recentEvent.id)
    }
  })

  it("should return null for last event when no previous events exist", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-no-last-event@example.com",
      full_name: "Test No Last Event"
    })

    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "First Event Ever",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: currentEvent.id,
      application_status: "pending",
      attendance_status: "pending"
    })

    const result = await getProfilesWithExtraDataById({ eventId: currentEvent.id })

    if (result.success) {
      const participant = result.data.find(p => p.profile_id === profile.id)
      expect(participant?.attended_events_count).toBe(0)
      expect(participant?.last_attended_event_title).toBeNull()
      expect(participant?.last_attended_event_date).toBeNull()
      expect(participant?.last_attended_event_id).toBeNull()
    }
  })
})

describe("getEventsForDashboard - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return all ViewEvent fields needed for EventCard display", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Full Event Data Test",
      emoji: "🎉",
      description: "This is a full test event",
      location: "Test Location",
      ticket_price: 100,
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      time_group_start: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      time_group_end: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      time_payment_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      time_payment_end: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
      total_spots: 50
    })

    const events = await getEventsForDashboard()

    expect(events).toBeDefined()
    expect(Array.isArray(events)).toBe(true)

    const createdEvent = events.find(e => e.id === event.id)
    expect(createdEvent).toBeDefined()

    // Verify all ViewEvent fields are present
    expect(createdEvent).toHaveProperty("id")
    expect(createdEvent).toHaveProperty("title")
    expect(createdEvent).toHaveProperty("description")
    expect(createdEvent).toHaveProperty("emoji")
    expect(createdEvent).toHaveProperty("event_status")
    expect(createdEvent).toHaveProperty("location")
    expect(createdEvent).toHaveProperty("ticket_price")
    expect(createdEvent).toHaveProperty("time_event_start")
    expect(createdEvent).toHaveProperty("time_event_end")
    expect(createdEvent).toHaveProperty("time_application_start")
    expect(createdEvent).toHaveProperty("time_group_start")
    expect(createdEvent).toHaveProperty("time_group_end")
    expect(createdEvent).toHaveProperty("time_payment_start")
    expect(createdEvent).toHaveProperty("time_payment_end")
  })

  it("should order events by time_event_start descending", async () => {
    const olderEvent = await createTestEvent(tracker, kysely, {
      title: "Older Event",
      time_event_start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const newerEvent = await createTestEvent(tracker, kysely, {
      title: "Newer Event",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const events = await getEventsForDashboard()

    const olderIndex = events.findIndex(e => e.id === olderEvent.id)
    const newerIndex = events.findIndex(e => e.id === newerEvent.id)

    expect(newerIndex).toBeLessThan(olderIndex)
  })

  it("should limit results to 50 events", async () => {
    const events = await getEventsForDashboard()

    expect(events.length).toBeLessThanOrEqual(50)
  })
})

describe("getAllProfiles - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()

    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb.selectFrom("profiles").select("id").where("email", "like", "test-global-%")
      )
      .execute()

    await kysely
      .deleteFrom("profiles")
      .where("email", "like", "test-global-%")
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return all profiles with computed fields", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-basic@example.com",
      full_name: "Test Global Basic",
      gender: ["man"],
      orientation: ["heterosexual"],
      where_lives: "São Paulo",
      flag: "none",
      approved_to_attend: "approved"
    })

    const result = await getAllProfiles()

    expect(result).toHaveProperty("success", true)
    if (result.success) {
      const foundProfile = result.data.find(p => p.id === profile.id)
      expect(foundProfile).toBeDefined()
      expect(foundProfile).toHaveProperty("id")
      expect(foundProfile).toHaveProperty("email", "test-global-basic@example.com")
      expect(foundProfile).toHaveProperty("full_name", "Test Global Basic")
      expect(foundProfile).toHaveProperty("attended_events_count")
      expect(foundProfile).toHaveProperty("last_attended_event_title")
      expect(foundProfile).toHaveProperty("last_attended_event_date")
      expect(foundProfile).toHaveProperty("last_attended_event_id")
    }
  })

  it("should calculate attended_events_count correctly", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-count@example.com",
      full_name: "Test Global Count"
    })

    const completedEvent1 = await createTestEvent(tracker, kysely, {
      title: "Completed Event 1",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    })

    const completedEvent2 = await createTestEvent(tracker, kysely, {
      title: "Completed Event 2",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: completedEvent1.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: completedEvent2.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    const result = await getAllProfiles()

    if (result.success) {
      const foundProfile = result.data.find(p => p.id === profile.id)
      expect(foundProfile?.attended_events_count).toBe(2)
    }
  })

  it("should return last_attended_event fields correctly", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-last-event@example.com",
      full_name: "Test Global Last Event"
    })

    const olderEvent = await createTestEvent(tracker, kysely, {
      title: "Older Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    })

    const recentEvent = await createTestEvent(tracker, kysely, {
      title: "Most Recent Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: olderEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: recentEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    const result = await getAllProfiles()

    if (result.success) {
      const foundProfile = result.data.find(p => p.id === profile.id)
      expect(foundProfile?.last_attended_event_title).toBe("Most Recent Event")
      expect(foundProfile?.last_attended_event_id).toBe(recentEvent.id)
      expect(foundProfile?.last_attended_event_date).toBeDefined()
    }
  })

  it("should filter by gender (array contains)", async () => {
    const manProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-gender-man@example.com",
      full_name: "Test Gender Man",
      gender: ["man"]
    })

    const womanProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-gender-woman@example.com",
      full_name: "Test Gender Woman",
      gender: ["woman"]
    })

    const result = await getAllProfiles({ gender: ["man"] })

    if (result.success) {
      const foundMan = result.data.find(p => p.id === manProfile.id)
      const foundWoman = result.data.find(p => p.id === womanProfile.id)
      expect(foundMan).toBeDefined()
      expect(foundWoman).toBeUndefined()
    }
  })

  it("should filter by orientation (array contains)", async () => {
    const heteroProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-orientation-hetero@example.com",
      full_name: "Test Orientation Hetero",
      orientation: ["heterosexual"]
    })

    const biProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-orientation-bi@example.com",
      full_name: "Test Orientation Bi",
      orientation: ["bisexual"]
    })

    const result = await getAllProfiles({ orientation: ["bisexual"] })

    if (result.success) {
      const foundHetero = result.data.find(p => p.id === heteroProfile.id)
      const foundBi = result.data.find(p => p.id === biProfile.id)
      expect(foundHetero).toBeUndefined()
      expect(foundBi).toBeDefined()
    }
  })

  it("should filter by is_veteran", async () => {
    const veteranProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-veteran@example.com",
      full_name: "Test Veteran",
      is_veteran: true
    })

    const rookieProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-rookie@example.com",
      full_name: "Test Rookie",
      is_veteran: false
    })

    const result = await getAllProfiles({ is_veteran: true })

    if (result.success) {
      const foundVeteran = result.data.find(p => p.id === veteranProfile.id)
      const foundRookie = result.data.find(p => p.id === rookieProfile.id)
      expect(foundVeteran).toBeDefined()
      expect(foundRookie).toBeUndefined()
    }
  })

  it("should filter by flag", async () => {
    const yellowFlagProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-flag-yellow@example.com",
      full_name: "Test Yellow Flag",
      flag: "yellow",
      flag_notes: "Test notes"
    })

    const noFlagProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-flag-none@example.com",
      full_name: "Test No Flag",
      flag: "none"
    })

    const result = await getAllProfiles({ flag: ["yellow"] })

    if (result.success) {
      const foundYellow = result.data.find(p => p.id === yellowFlagProfile.id)
      const foundNone = result.data.find(p => p.id === noFlagProfile.id)
      expect(foundYellow).toBeDefined()
      expect(foundNone).toBeUndefined()
    }
  })

  it("should filter by where_lives (partial match)", async () => {
    const spProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-city-sp@example.com",
      full_name: "Test SP City",
      where_lives: "São Paulo"
    })

    const rjProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-city-rj@example.com",
      full_name: "Test RJ City",
      where_lives: "Rio de Janeiro"
    })

    const result = await getAllProfiles({ where_lives: "Paulo" })

    if (result.success) {
      const foundSP = result.data.find(p => p.id === spProfile.id)
      const foundRJ = result.data.find(p => p.id === rjProfile.id)
      expect(foundSP).toBeDefined()
      expect(foundRJ).toBeUndefined()
    }
  })

  it("should filter by approved_to_attend", async () => {
    const approvedProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-approved@example.com",
      full_name: "Test Approved",
      approved_to_attend: "approved"
    })

    const pendingProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-pending@example.com",
      full_name: "Test Pending",
      approved_to_attend: "pending"
    })

    const result = await getAllProfiles({ approved_to_attend: ["approved"] })

    if (result.success) {
      const foundApproved = result.data.find(p => p.id === approvedProfile.id)
      const foundPending = result.data.find(p => p.id === pendingProfile.id)
      expect(foundApproved).toBeDefined()
      expect(foundPending).toBeUndefined()
    }
  })

  it("should combine multiple filters", async () => {
    const matchingProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-multi-match@example.com",
      full_name: "Test Multi Match",
      gender: ["man"],
      is_veteran: true,
      flag: "none",
      approved_to_attend: "approved"
    })

    const nonMatchingProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-multi-nomatch@example.com",
      full_name: "Test Multi No Match",
      gender: ["woman"],
      is_veteran: true,
      flag: "none",
      approved_to_attend: "approved"
    })

    const result = await getAllProfiles({
      gender: ["man"],
      is_veteran: true,
      approved_to_attend: ["approved"]
    })

    if (result.success) {
      const foundMatch = result.data.find(p => p.id === matchingProfile.id)
      const foundNoMatch = result.data.find(p => p.id === nonMatchingProfile.id)
      expect(foundMatch).toBeDefined()
      expect(foundNoMatch).toBeUndefined()
    }
  })

  it("should return empty array when no matches", async () => {
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-nomatch@example.com",
      full_name: "Test No Match",
      gender: ["man"]
    })

    const result = await getAllProfiles({ gender: ["non-binary"] })

    expect(result).toHaveProperty("success", true)
    if (result.success) {
      const testProfiles = result.data.filter(p => p.email?.startsWith("test-global-"))
      expect(testProfiles).toHaveLength(0)
    }
  })

  it("should exclude cancelled events from count", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-cancelled@example.com",
      full_name: "Test Cancelled Events"
    })

    const completedEvent = await createTestEvent(tracker, kysely, {
      title: "Completed Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    })

    const cancelledEvent = await createTestEvent(tracker, kysely, {
      title: "Cancelled Event",
      event_status: "Cancelled",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: completedEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: cancelledEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    const result = await getAllProfiles()

    if (result.success) {
      const foundProfile = result.data.find(p => p.id === profile.id)
      expect(foundProfile?.attended_events_count).toBe(1)
    }
  })

  it("should only count attended and finalised events", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-status@example.com",
      full_name: "Test Status"
    })

    const attendedEvent = await createTestEvent(tracker, kysely, {
      title: "Attended Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    })

    const notAttendedEvent = await createTestEvent(tracker, kysely, {
      title: "Not Attended Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    const pendingEvent = await createTestEvent(tracker, kysely, {
      title: "Pending Event",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: attendedEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: notAttendedEvent.id,
      application_status: "finalised",
      attendance_status: "not-attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: pendingEvent.id,
      application_status: "pending",
      attendance_status: "pending"
    })

    const result = await getAllProfiles()

    if (result.success) {
      const foundProfile = result.data.find(p => p.id === profile.id)
      expect(foundProfile?.attended_events_count).toBe(1)
    }
  })

  it("should return null for last event when no events exist", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-no-events@example.com",
      full_name: "Test No Events"
    })

    const result = await getAllProfiles()

    if (result.success) {
      const foundProfile = result.data.find(p => p.id === profile.id)
      expect(foundProfile?.attended_events_count).toBe(0)
      expect(foundProfile?.last_attended_event_title).toBeNull()
      expect(foundProfile?.last_attended_event_date).toBeNull()
      expect(foundProfile?.last_attended_event_id).toBeNull()
    }
  })

  it("should handle empty filter arrays without errors", async () => {
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-empty-filters@example.com",
      full_name: "Test Empty Filters"
    })

    const result = await getAllProfiles({
      gender: [],
      orientation: [],
      flag: [],
      approved_to_attend: []
    })

    expect(result).toHaveProperty("success", true)
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true)
    }
  })

  it("should support pagination with limit", async () => {
    for (let i = 0; i < 5; i++) {
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `test-global-pagination-${i}@example.com`,
        full_name: `Test Pagination ${i}`
      })
    }

    const result = await getAllProfiles({ limit: 3 })

    expect(result).toHaveProperty("success", true)
    if (result.success) {
      expect(result.data.length).toBeLessThanOrEqual(3)
    }
  })

  it("should support pagination with offset", async () => {
    const profiles = []
    for (let i = 0; i < 3; i++) {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `test-global-offset-${i}@example.com`,
        full_name: `AAA Test Offset ${i}` // AAA prefix to ensure they come first in ordering
      })
      profiles.push(profile)
    }

    const firstPage = await getAllProfiles({ limit: 2, offset: 0 })
    const secondPage = await getAllProfiles({ limit: 2, offset: 2 })

    expect(firstPage).toHaveProperty("success", true)
    expect(secondPage).toHaveProperty("success", true)

    if (firstPage.success && secondPage.success) {
      // Ensure results are different (offset working)
      const firstPageIds = firstPage.data.map(p => p.id)
      const secondPageIds = secondPage.data.map(p => p.id)
      const overlap = firstPageIds.filter(id => secondPageIds.includes(id))
      expect(overlap).toHaveLength(0)
    }
  })

  it("should return results ordered by full_name", async () => {
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-order-z@example.com",
      full_name: "Zzzz Last Name"
    })

    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-global-order-a@example.com",
      full_name: "Aaaa First Name"
    })

    const result = await getAllProfiles()

    expect(result).toHaveProperty("success", true)
    if (result.success) {
      const testProfiles = result.data.filter(p => p.email?.startsWith("test-global-order-"))
      if (testProfiles.length >= 2) {
        const firstIndex = result.data.findIndex(p => p.email === "test-global-order-a@example.com")
        const lastIndex = result.data.findIndex(p => p.email === "test-global-order-z@example.com")
        expect(firstIndex).toBeLessThan(lastIndex)
      }
    }
  })
})

describe("getProfileById - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()

    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb.selectFrom("profiles").select("id").where("email", "like", "test-profile-by-id-%")
      )
      .execute()

    await kysely
      .deleteFrom("profiles")
      .where("email", "like", "test-profile-by-id-%")
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return a single profile with computed fields", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-profile-by-id-basic@example.com",
      full_name: "Test Profile By Id",
      gender: ["man"],
      orientation: ["heterosexual"],
      where_lives: "São Paulo",
      flag: "none",
      approved_to_attend: "approved"
    })

    const result = await getProfileById({ profileId: profile.id })

    expect(result).toHaveProperty("success", true)
    if (result.success) {
      expect(result.data).toBeDefined()
      expect(result.data.id).toBe(profile.id)
      expect(result.data.email).toBe("test-profile-by-id-basic@example.com")
      expect(result.data.full_name).toBe("Test Profile By Id")
      expect(result.data).toHaveProperty("attended_events_count")
      expect(result.data).toHaveProperty("last_attended_event_title")
      expect(result.data).toHaveProperty("last_attended_event_date")
      expect(result.data).toHaveProperty("last_attended_event_id")
    }
  })

  it("should return error when profile does not exist", async () => {
    const result = await getProfileById({ profileId: "non-existent-id" })

    expect(result).toHaveProperty("success", false)
  })

  it("should calculate attended_events_count correctly", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-profile-by-id-count@example.com",
      full_name: "Test Count"
    })

    const event1 = await createTestEvent(tracker, kysely, {
      title: "Event 1",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    })

    const event2 = await createTestEvent(tracker, kysely, {
      title: "Event 2",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event1.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event2.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    const result = await getProfileById({ profileId: profile.id })

    if (result.success) {
      expect(result.data.attended_events_count).toBe(2)
    }
  })

  it("should return last_attended_event fields correctly", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-profile-by-id-last-event@example.com",
      full_name: "Test Last Event"
    })

    const olderEvent = await createTestEvent(tracker, kysely, {
      title: "Older Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    })

    const recentEvent = await createTestEvent(tracker, kysely, {
      title: "Most Recent Event",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: olderEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: recentEvent.id,
      application_status: "finalised",
      attendance_status: "attended"
    })

    const result = await getProfileById({ profileId: profile.id })

    if (result.success) {
      expect(result.data.last_attended_event_title).toBe("Most Recent Event")
      expect(result.data.last_attended_event_id).toBe(recentEvent.id)
      expect(result.data.last_attended_event_date).toBeDefined()
    }
  })

  it("should return null for last event when no events exist", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-profile-by-id-no-events@example.com",
      full_name: "Test No Events"
    })

    const result = await getProfileById({ profileId: profile.id })

    if (result.success) {
      expect(result.data.attended_events_count).toBe(0)
      expect(result.data.last_attended_event_title).toBeNull()
      expect(result.data.last_attended_event_date).toBeNull()
      expect(result.data.last_attended_event_id).toBeNull()
    }
  })
})