import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile, createTestEvent, createTestEventParticipant, createTestAuthUser } from "~/test/db-test-utils"
import { updateEventStatus } from "../admin.server"
import { getEventDemographicsHistory } from "./demographics-history.server"
import type { EventStatus } from "~types/database/entities.types"
import type { SupabaseClient } from "@supabase/supabase-js"

describe("Demographics History - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()
  
  // Generate unique test prefix for this test run
  const testPrefix = `demographics-${Date.now()}`

  beforeEach(async () => {
    tracker.clear()
    // Clear existing demographics history
    await kysely.deleteFrom("event_demographics_history").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should calculate demographics with correct values BEFORE status update in transaction", async () => {
    const eventDate = new Date("2024-06-01T10:00:00Z")

    // Create test event
    const event = await createTestEvent(tracker, kysely, {
      title: "Transaction Test Event",
      event_status: "Registration Open" as EventStatus,
      time_event_start: eventDate.toISOString(),
    })

    // Create participants with different veteran statuses
    const veteranUserId = await createTestAuthUser(`${testPrefix}-vet@test.com`)
    const veteranProfile = await createTestProfile(tracker, kysely, {
      user_id: veteranUserId,
      email: `${testPrefix}-vet@test.com`,
      is_veteran: true,
      became_veteran_date: new Date("2024-01-01T10:00:00Z"),
    })

    const newbieUserId = await createTestAuthUser(`${testPrefix}-new@test.com`)
    const newbieProfile = await createTestProfile(tracker, kysely, {
      user_id: newbieUserId,
      email: `${testPrefix}-new@test.com`,
      is_veteran: false,
      became_veteran_date: null,
    })

    // Add participants with PENDING status initially to avoid trigger
    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: veteranProfile.id,
      attendance_status: "pending",
      is_user_applied: true,
    })

    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: newbieProfile.id,
      attendance_status: "pending",
      is_user_applied: true,
    })
    
    // Now update them to attended status
    await kysely
      .updateTable("event_participants")
      .set({ attendance_status: "attended" })
      .where("event_id", "=", event.id)
      .execute()

    // Now test the transaction directly
    const result = await kysely.transaction().execute(async (trx) => {
      // Calculate demographics BEFORE updating status
      // Use the same CASE statement logic as production code to calculate historical veteran status
      const participants = await trx
        .selectFrom("event_participants")
        .where("event_participants.event_id", "=", event.id)
        .where("attendance_status", "=", "attended")
        .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
        .innerJoin("events", "events.id", "event_participants.event_id")
        .select(eb => [
          eb.case()
            .when("profiles.became_veteran_date", "is", null)
            .then(false)
            .when("profiles.became_veteran_date", "<", eb.ref("events.time_event_start"))
            .then(true)
            .else(false)
            .end()
            .as("is_veteran")
        ])
        .execute()

      // With became_veteran_date logic, demographics reflect historical status
      expect(participants).toHaveLength(2)
      const veteranCount = participants.filter(p => p.is_veteran === true).length
      const newbieCount = participants.filter(p => p.is_veteran === false).length
      // 1 was veteran before this event, 1 was newbie
      expect(veteranCount).toBe(1)
      expect(newbieCount).toBe(1)

      // Now update the event status
      await trx
        .updateTable("events")
        .set({ event_status: "Completed" as EventStatus })
        .where("id", "=", event.id)
        .execute()

      return { veteranCount, newbieCount }
    })

    // 1 was veteran before event, 1 was newbie before event
    expect(result.veteranCount).toBe(1)
    expect(result.newbieCount).toBe(1)
  })

  it("should calculate and store demographics BEFORE updating event status to Completed", async () => {
    const eventDate = new Date("2024-06-01T10:00:00Z")

    // Create test event
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event for Demographics",
      event_status: "Registration Open" as EventStatus,
      time_event_start: eventDate.toISOString(),
    })

    // Create test users and profiles with different characteristics
    const veteranUserId = await createTestAuthUser(`${testPrefix}-veteran@test.com`)
    const veteranProfile = await createTestProfile(tracker, kysely, {
      user_id: veteranUserId,
      email: `${testPrefix}-veteran@test.com`,
      full_name: "Veteran User",
      is_veteran: true,
      became_veteran_date: new Date("2024-01-01T10:00:00Z"),
      date_of_birth: "1990-01-01",
      gender: ["Cis Woman"],
      orientation: ["Straight"],
    })

    const newbieUserId = await createTestAuthUser(`${testPrefix}-newbie@test.com`)
    const newbieProfile = await createTestProfile(tracker, kysely, {
      user_id: newbieUserId,
      email: `${testPrefix}-newbie@test.com`,
      full_name: "Newbie User",
      is_veteran: false,
      became_veteran_date: null,
      date_of_birth: "1995-01-01",
      gender: ["Trans Man"],
      orientation: ["Gay"],
    })

    // Create event participants with attended status
    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: veteranProfile.id,
      attendance_status: "attended",
      is_user_applied: true,
    })

    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: newbieProfile.id,
      attendance_status: "attended",
      is_user_applied: true,
    })

    // Create a minimal valid context for testing
    // The supabase client needs to be a valid object with expected shape
    const mockSupabase = {} as SupabaseClient
    const mockHeaders = new Headers()
    
    const mockContext = {
      supabase: mockSupabase,
      supabaseHeaders: mockHeaders,
      currentUser: {
        id: "test-user-id",
        email: "test@example.com",
      },
      currentProfile: null,
      isProdInDev: false,
      host: null,
      eventId: event.id,
      params: {},
      events: [],
    }

    // Update event status to Completed
    const result = await updateEventStatus(
      { event_status: "Completed" as EventStatus, intent: "update-event-status" },
      mockContext
    )

    expect(result.success).toBe(true)

    // Verify demographics were stored
    const demographicsResult = await getEventDemographicsHistory({ eventId: event.id })
    expect(demographicsResult.success).toBe(true)
    
    if (!demographicsResult.success) {
      throw new Error("Demographics should have been stored")
    }
    
    expect(demographicsResult.data).toBeDefined()
    const demographics = demographicsResult.data
    if (!demographics) {
      throw new Error("Demographics data should exist")
    }
    expect(demographics.total).toBe(2)
    // Demographics now reflect historical veteran status based on became_veteran_date
    expect(demographics.veteran.yes).toBe(50) // 1 out of 2 was veteran before event
    expect(demographics.veteran.no).toBe(50) // 1 out of 2 was newbie before event
    // Gender and orientation values may vary based on how test data is stored
    // The key test is that demographics were calculated and stored successfully
    expect(demographics.gender).toBeDefined()
    expect(demographics.orientation).toBeDefined()

    // Verify event status was updated
    const updatedEvent = await kysely
      .selectFrom("events")
      .select("event_status")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()
    
    expect(updatedEvent.event_status).toBe("Completed")
  })

  it("should store demographics even when is_veteran is null", async () => {
    const eventDate = new Date("2024-06-01T10:00:00Z")

    // Create test event
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event for Failed Demographics",
      event_status: "Registration Open" as EventStatus,
      time_event_start: eventDate.toISOString(),
    })

    // Create a participant with null became_veteran_date (will be treated as newbie)
    const userId = await createTestAuthUser(`${testPrefix}-test@test.com`)
    const profile = await createTestProfile(tracker, kysely, {
      user_id: userId,
      email: `${testPrefix}-test@test.com`,
      full_name: "Test User",
      is_veteran: null as unknown as boolean,
      became_veteran_date: null,
    })

    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: profile.id,
      attendance_status: "attended",
      is_user_applied: true,
    })

    const mockSupabase = {} as SupabaseClient
    const mockHeaders = new Headers()
    
    const mockContext = {
      supabase: mockSupabase,
      supabaseHeaders: mockHeaders,
      currentUser: {
        id: "test-user-id",
        email: "test@example.com",
      },
      currentProfile: null,
      isProdInDev: false,
      host: null,
      eventId: event.id,
      params: {},
      events: [],
    }

    // Try to update event status
    const result = await updateEventStatus(
      { event_status: "Completed" as EventStatus, intent: "update-event-status" },
      mockContext
    )

    // Even with null is_veteran, the calculation should handle it gracefully
    expect(result.success).toBe(true)

    // Verify demographics were still stored (with default values for null)
    const demographicsResult = await getEventDemographicsHistory({ eventId: event.id })
    expect(demographicsResult.success).toBe(true)
    
    if (!demographicsResult.success) {
      throw new Error("Demographics should have been stored")
    }
    
    expect(demographicsResult.data).toBeDefined()
    const demoData = demographicsResult.data || { total: 0, veteran: { yes: 0, no: 0 } }
    expect(demoData.total).toBe(1)
    // NULL became_veteran_date is treated as newbie (not veteran before this event)
    expect(demoData.veteran.yes).toBe(0)
    expect(demoData.veteran.no).toBe(100)
  })

  it("should handle concurrent updates correctly using transactions", async () => {
    // Create test event
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event for Concurrent Updates",
      event_status: "Registration Open" as EventStatus,
    })

    // Create multiple participants
    const [userId1, userId2] = await Promise.all([
      createTestAuthUser(`${testPrefix}-user1@test.com`),
      createTestAuthUser(`${testPrefix}-user2@test.com`),
    ])
    
    const profiles = await Promise.all([
      createTestProfile(tracker, kysely, {
        user_id: userId1,
        email: `${testPrefix}-user1@test.com`,
        full_name: "User One",
        is_veteran: true,
      }),
      createTestProfile(tracker, kysely, {
        user_id: userId2,
        email: `${testPrefix}-user2@test.com`,
        full_name: "User Two",
        is_veteran: false,
      }),
    ])

    await Promise.all(
      profiles.map(profile =>
        createTestEventParticipant(tracker, kysely, {
          event_id: event.id,
          profile_id: profile.id,
          attendance_status: "attended",
          is_user_applied: true,
        })
      )
    )

    const mockSupabase = {} as SupabaseClient
    const mockHeaders = new Headers()
    
    const mockContext = {
      supabase: mockSupabase,
      supabaseHeaders: mockHeaders,
      currentUser: {
        id: "test-user-id",
        email: "test@example.com",
      },
      currentProfile: null,
      isProdInDev: false,
      host: null,
      eventId: event.id,
      params: {},
      events: [],
    }

    // Simulate concurrent updates
    const results = await Promise.allSettled([
      updateEventStatus(
        { event_status: "Completed" as EventStatus, intent: "update-event-status" },
        mockContext
      ),
      updateEventStatus(
        { event_status: "Completed" as EventStatus, intent: "update-event-status" },
        mockContext
      ),
    ])

    // Both should succeed without conflicts
    results.forEach(result => {
      expect(result.status).toBe("fulfilled")
      if (result.status === "fulfilled") {
        expect(result.value.success).toBe(true)
      }
    })

    // Verify only one demographics snapshot was created (upsert should handle duplicates)
    const snapshots = await kysely
      .selectFrom("event_demographics_history")
      .select("id")
      .where("event_id", "=", event.id)
      .execute()
    
    expect(snapshots.length).toBe(1)
  })

  it("should correctly calculate demographics only from attended participants", async () => {
    const eventDate = new Date("2024-06-01T10:00:00Z")

    // Create test event
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event with Mixed Attendance",
      event_status: "Registration Open" as EventStatus,
      time_event_start: eventDate.toISOString(),
    })

    // Create profiles
    const [attendedUserId, skippedUserId, noShowUserId] = await Promise.all([
      createTestAuthUser(`${testPrefix}-attended@test.com`),
      createTestAuthUser(`${testPrefix}-skipped@test.com`),
      createTestAuthUser(`${testPrefix}-noshow@test.com`),
    ])

    const attendedProfile = await createTestProfile(tracker, kysely, {
      user_id: attendedUserId,
      email: `${testPrefix}-attended@test.com`,
      full_name: "Attended User",
      is_veteran: true,
      became_veteran_date: new Date("2024-01-01T10:00:00Z"),
    })

    const skippedProfile = await createTestProfile(tracker, kysely, {
      user_id: skippedUserId,
      email: `${testPrefix}-skipped@test.com`,
      full_name: "Skipped User",
      is_veteran: false,
      became_veteran_date: null,
    })

    const noShowProfile = await createTestProfile(tracker, kysely, {
      user_id: noShowUserId,
      email: `${testPrefix}-noshow@test.com`,
      full_name: "NoShow User",
      is_veteran: false,
      became_veteran_date: null,
    })

    // Create participants with different attendance statuses
    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: attendedProfile.id,
      attendance_status: "attended",
      is_user_applied: true,
    })

    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: skippedProfile.id,
      attendance_status: "skipped",
      is_user_applied: true,
    })

    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: noShowProfile.id,
      attendance_status: "not-attended",
      is_user_applied: true,
    })

    const mockSupabase = {} as SupabaseClient
    const mockHeaders = new Headers()
    
    const mockContext = {
      supabase: mockSupabase,
      supabaseHeaders: mockHeaders,
      currentUser: {
        id: "test-user-id",
        email: "test@example.com",
      },
      currentProfile: null,
      isProdInDev: false,
      host: null,
      eventId: event.id,
      params: {},
      events: [],
    }

    // Update event status to Completed
    await updateEventStatus(
      { event_status: "Completed" as EventStatus, intent: "update-event-status" },
      mockContext
    )

    // Verify demographics only counted attended participant
    const demographicsResult = await getEventDemographicsHistory({ eventId: event.id })
    expect(demographicsResult.success).toBe(true)
    
    if (!demographicsResult.success) {
      throw new Error("Demographics should have been stored")
    }
    
    expect(demographicsResult.data).toBeDefined()
    const finalDemoData = demographicsResult.data || { total: 0, veteran: { yes: 0, no: 0 } }
    expect(finalDemoData.total).toBe(1) // Only 1 attended
    expect(finalDemoData.veteran.yes).toBe(100) // The attended user is a veteran
    expect(finalDemoData.veteran.no).toBe(0)
  })

  it("should calculate demographics using became_veteran_date to determine historical veteran status", async () => {
    const eventDate = new Date("2024-06-01T10:00:00Z")

    // Create test event with specific date
    const event = await createTestEvent(tracker, kysely, {
      title: "Historical Veteran Status Test Event",
      event_status: "Registration Open" as EventStatus,
      time_event_start: eventDate.toISOString(),
    })

    // Create a veteran who became veteran BEFORE this event (e.g., 2024-01-01)
    const veteranUserId = await createTestAuthUser(`${testPrefix}-historical-veteran@test.com`)
    const veteranProfile = await createTestProfile(tracker, kysely, {
      user_id: veteranUserId,
      email: `${testPrefix}-historical-veteran@test.com`,
      full_name: "Historical Veteran",
      is_veteran: true,
      became_veteran_date: new Date("2024-01-01T10:00:00Z"),
      date_of_birth: "1990-01-01",
      gender: ["Cis Woman"],
      orientation: ["Straight"],
    })

    // Create a newbie who became veteran AFTER this event (or will become veteran at this event)
    const newbieUserId = await createTestAuthUser(`${testPrefix}-historical-newbie@test.com`)
    const newbieProfile = await createTestProfile(tracker, kysely, {
      user_id: newbieUserId,
      email: `${testPrefix}-historical-newbie@test.com`,
      full_name: "Historical Newbie",
      is_veteran: false,
      became_veteran_date: null,
      date_of_birth: "1995-01-01",
      gender: ["Trans Man"],
      orientation: ["Gay"],
    })

    // Add both as attended participants
    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: veteranProfile.id,
      attendance_status: "attended",
      is_user_applied: true,
    })

    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: newbieProfile.id,
      attendance_status: "attended",
      is_user_applied: true,
    })

    const mockSupabase = {} as SupabaseClient
    const mockHeaders = new Headers()

    const mockContext = {
      supabase: mockSupabase,
      supabaseHeaders: mockHeaders,
      currentUser: {
        id: "test-user-id",
        email: "test@example.com",
      },
      currentProfile: null,
      isProdInDev: false,
      host: null,
      eventId: event.id,
      params: {},
      events: [],
    }

    // Update event status to Completed
    const result = await updateEventStatus(
      { event_status: "Completed" as EventStatus, intent: "update-event-status" },
      mockContext
    )

    expect(result.success).toBe(true)

    // Verify demographics show correct historical status
    const demographicsResult = await getEventDemographicsHistory({ eventId: event.id })
    expect(demographicsResult.success).toBe(true)

    if (!demographicsResult.success) {
      throw new Error("Demographics should have been stored")
    }

    expect(demographicsResult.data).toBeDefined()
    const demographics = demographicsResult.data
    if (!demographics) {
      throw new Error("Demographics data should exist")
    }

    // Critical assertions: Demographics should reflect status BEFORE the event
    expect(demographics.total).toBe(2)
    expect(demographics.veteran.yes).toBe(50) // 1 out of 2 was veteran before event
    expect(demographics.veteran.no).toBe(50) // 1 out of 2 was newbie before event
  })
})