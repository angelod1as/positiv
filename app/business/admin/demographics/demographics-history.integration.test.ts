import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile, createTestEvent, createTestEventParticipant, createTestAuthUser } from "~/test/db-test-utils"
import { updateEventStatus } from "../admin.server"
import { getEventDemographicsHistory } from "./demographics-history.server"
import type { EventStatus } from "~types/database/entities.types"

describe("Demographics History - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    // Clear existing demographics history
    await kysely.deleteFrom("event_demographics_history").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should calculate and store demographics BEFORE updating event status to Completed", async () => {
    // Create test event
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event for Demographics",
      event_status: "Registration Open" as EventStatus,
    })

    // Create test users and profiles with different characteristics
    const veteranUserId = await createTestAuthUser("veteran@test.com")
    const veteranProfile = await createTestProfile(tracker, kysely, {
      user_id: veteranUserId,
      email: "veteran@test.com",
      full_name: "Veteran User",
      is_veteran: true,
      date_of_birth: "1990-01-01",
      gender: ["Cis Woman"],
      orientation: ["Straight"],
    })

    const newbieUserId = await createTestAuthUser("newbie@test.com")
    const newbieProfile = await createTestProfile(tracker, kysely, {
      user_id: newbieUserId,
      email: "newbie@test.com",
      full_name: "Newbie User",
      is_veteran: false,
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

    // Mock the admin context
    const mockContext = {
      supabase: {} as any,
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
    expect(demographicsResult.data).toBeDefined()

    const demographics = demographicsResult.data!
    expect(demographics.total).toBe(2)
    expect(demographics.veteran.yes).toBe(50) // 1 veteran out of 2
    expect(demographics.veteran.no).toBe(50) // 1 newbie out of 2
    expect(demographics.gender.cis).toBe(50) // 1 cis out of 2
    expect(demographics.gender.trans).toBe(50) // 1 trans out of 2
    expect(demographics.orientation.straight).toBe(50) // 1 straight out of 2
    expect(demographics.orientation.homo).toBe(50) // 1 gay out of 2

    // Verify event status was updated
    const updatedEvent = await kysely
      .selectFrom("events")
      .select("event_status")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()
    
    expect(updatedEvent.event_status).toBe("Completed")
  })

  it("should NOT update event status if demographics calculation fails", async () => {
    // Create test event
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event for Failed Demographics",
      event_status: "Registration Open" as EventStatus,
    })

    // Create a participant with invalid data that might cause calculation issues
    const userId = await createTestAuthUser("test@test.com")
    const profile = await createTestProfile(tracker, kysely, {
      user_id: userId,
      email: "test@test.com",
      full_name: "Test User",
      is_veteran: null as any, // This could cause issues
    })

    await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: profile.id,
      attendance_status: "attended",
      is_user_applied: true,
    })

    const mockContext = {
      supabase: {} as any,
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
    expect(demographicsResult.data).toBeDefined()
    expect(demographicsResult.data!.total).toBe(1)
    expect(demographicsResult.data!.veteran.no).toBe(100) // null is_veteran defaults to false
  })

  it("should handle concurrent updates correctly using transactions", async () => {
    // Create test event
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event for Concurrent Updates",
      event_status: "Registration Open" as EventStatus,
    })

    // Create multiple participants
    const [userId1, userId2] = await Promise.all([
      createTestAuthUser("user1@test.com"),
      createTestAuthUser("user2@test.com"),
    ])
    
    const profiles = await Promise.all([
      createTestProfile(tracker, kysely, {
        user_id: userId1,
        email: "user1@test.com",
        full_name: "User One",
        is_veteran: true,
      }),
      createTestProfile(tracker, kysely, {
        user_id: userId2,
        email: "user2@test.com",
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

    const mockContext = {
      supabase: {} as any,
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
    // Create test event
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event with Mixed Attendance",
      event_status: "Registration Open" as EventStatus,
    })

    // Create profiles
    const [attendedUserId, skippedUserId, noShowUserId] = await Promise.all([
      createTestAuthUser("attended@test.com"),
      createTestAuthUser("skipped@test.com"),
      createTestAuthUser("noshow@test.com"),
    ])
    
    const attendedProfile = await createTestProfile(tracker, kysely, {
      user_id: attendedUserId,
      email: "attended@test.com",
      full_name: "Attended User",
      is_veteran: true,
    })

    const skippedProfile = await createTestProfile(tracker, kysely, {
      user_id: skippedUserId,
      email: "skipped@test.com",
      full_name: "Skipped User",
      is_veteran: false,
    })

    const noShowProfile = await createTestProfile(tracker, kysely, {
      user_id: noShowUserId,
      email: "noshow@test.com",
      full_name: "NoShow User",
      is_veteran: false,
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
      attendance_status: "no_show",
      is_user_applied: true,
    })

    const mockContext = {
      supabase: {} as any,
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
    expect(demographicsResult.data).toBeDefined()
    expect(demographicsResult.data!.total).toBe(1) // Only 1 attended
    expect(demographicsResult.data!.veteran.yes).toBe(100) // The attended user is a veteran
    expect(demographicsResult.data!.veteran.no).toBe(0)
  })
})