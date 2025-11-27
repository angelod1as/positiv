import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { sql } from "kysely"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"
import { getProfilesWithExtraDataById } from "./admin.server"

describe("getProfilesWithExtraDataById - Query Performance Optimization (POS-275)", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()

    // Clear any existing event participants for test profiles
    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb
          .selectFrom("profiles")
          .select("id")
          .where("email", "like", "test-query-opt-%"),
      )
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return profiles with extra data including was_admin_skipped_last_event", async () => {
    // Create test profiles
    const profileSkippedLast = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-query-opt-skipped@example.com",
      full_name: "Test Profile - Skipped Last",
    })

    const profileAttendedLast = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-query-opt-attended@example.com",
      full_name: "Test Profile - Attended Last",
    })

    const profileNoHistory = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-query-opt-no-history@example.com",
      full_name: "Test Profile - No History",
    })

    // Create events ordered by time (older to newer)
    const oldEvent = await createTestEvent(tracker, kysely, {
      title: "Old Event",
      emoji: "📅",
      location: "Location 1",
      description: "Description 1",
      event_status: "Completed",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 60 days ago
      time_event_end: new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date(
        Date.now() - 74 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_end: new Date(
        Date.now() - 62 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    const middleEvent = await createTestEvent(tracker, kysely, {
      title: "Middle Event (Last for participants)",
      emoji: "🎭",
      location: "Location 2",
      description: "Description 2",
      event_status: "Completed",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 30 days ago
      time_event_end: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date(
        Date.now() - 44 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_end: new Date(
        Date.now() - 32 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 150,
      total_spots: 30,
    })

    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Event",
      emoji: "🎉",
      location: "Location 3",
      description: "Description 3",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 30 days from now
      time_event_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 200,
      total_spots: 40,
    })

    // Profile 1: Has history, was skipped in last event (middleEvent)
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileSkippedLast.id,
      event_id: oldEvent.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "attended",
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileSkippedLast.id,
      event_id: middleEvent.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "skipped", // This is the LAST event for this profile
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileSkippedLast.id,
      event_id: currentEvent.id,
      is_user_applied: true,
      application_status: "pending",
      attendance_status: "pending",
    })

    // Profile 2: Has history, attended in last event (middleEvent)
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileAttendedLast.id,
      event_id: oldEvent.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "attended",
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileAttendedLast.id,
      event_id: middleEvent.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "attended", // This is the LAST event for this profile
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileAttendedLast.id,
      event_id: currentEvent.id,
      is_user_applied: true,
      application_status: "pending",
      attendance_status: "pending",
    })

    // Profile 3: No history, first event
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileNoHistory.id,
      event_id: currentEvent.id,
      is_user_applied: true,
      application_status: "pending",
      attendance_status: "pending",
    })

    // Test the function
    const result = await getProfilesWithExtraDataById({
      eventId: currentEvent.id,
    })

    if (!result.success) {
      console.error("Query failed:", result.errors)
    }

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data).toHaveLength(3)

      // Profile 1: Should have was_admin_skipped_last_event = true
      const profile1Data = result.data.find(
        (p) => p.profile_id === profileSkippedLast.id,
      )
      expect(profile1Data).toBeDefined()
      expect(profile1Data?.was_admin_skipped_last_event).toBe(true)

      // Profile 2: Should have was_admin_skipped_last_event = false
      const profile2Data = result.data.find(
        (p) => p.profile_id === profileAttendedLast.id,
      )
      expect(profile2Data).toBeDefined()
      expect(profile2Data?.was_admin_skipped_last_event).toBe(false)

      // Profile 3: Should have was_admin_skipped_last_event = null (no history)
      const profile3Data = result.data.find(
        (p) => p.profile_id === profileNoHistory.id,
      )
      expect(profile3Data).toBeDefined()
      // When there's no previous event, the field should be null or false
      expect(
        profile3Data?.was_admin_skipped_last_event === null ||
          profile3Data?.was_admin_skipped_last_event === false,
      ).toBe(true)
    }
  })

  it("should measure query performance with EXPLAIN ANALYZE", async () => {
    // Create test data for performance measurement
    const profiles = []
    const events = []

    // Create multiple profiles
    for (let i = 0; i < 10; i++) {
      profiles.push(
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `test-query-opt-perf-${i}@example.com`,
          full_name: `Test Profile ${i}`,
        }),
      )
    }

    // Create multiple events (past events for history)
    for (let i = 0; i < 5; i++) {
      events.push(
        await createTestEvent(tracker, kysely, {
          title: `Performance Test Event ${i}`,
          emoji: "🎯",
          location: `Location ${i}`,
          description: `Description ${i}`,
          event_status: "Completed",
          event_type: "regular",
          time_event_start: new Date(
            Date.now() - (60 - i * 10) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          time_event_end: new Date(
            Date.now() - (60 - i * 10) * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          ).toISOString(),
          time_application_start: new Date(
            Date.now() - (74 - i * 10) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          time_application_end: new Date(
            Date.now() - (62 - i * 10) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ticket_price: 100,
          total_spots: 50,
        }),
      )
    }

    // Create current event
    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Performance Test Event",
      emoji: "🎯",
      location: "Location Current",
      description: "Current Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_event_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 200,
      total_spots: 40,
    })

    // Create event participants for all profiles in all events
    for (const profile of profiles) {
      for (const event of events) {
        await createTestEventParticipant(tracker, kysely, {
          profile_id: profile.id,
          event_id: event.id,
          is_user_applied: true,
          application_status: "finalised",
          attendance_status: Math.random() > 0.5 ? "attended" : "skipped",
        })
      }

      // Add participation in current event
      await createTestEventParticipant(tracker, kysely, {
        profile_id: profile.id,
        event_id: currentEvent.id,
        is_user_applied: true,
        application_status: "pending",
        attendance_status: "pending",
      })
    }

    // Run EXPLAIN ANALYZE on the query
    const explainQuery = kysely
      .selectFrom("event_participants as current_ep")
      .innerJoin("profiles as p", "current_ep.profile_id", "p.id")
      .leftJoin(
        (eb) =>
          eb
            .selectFrom("event_participants as ep")
            .innerJoin("events as e", "ep.event_id", "e.id")
            .select([
              "ep.profile_id",
              "ep.application_status",
              "ep.attendance_status",
              "ep.has_paid",
              sql<number>`row_number() over (
              partition by ep.profile_id
              order by e.time_event_start desc
            )`.as("rn"),
            ])
            .where("ep.is_user_applied", "=", true)
            .as("ranked_events"),
        (join) =>
          join
            .onRef("ranked_events.profile_id", "=", "current_ep.profile_id")
            .on("ranked_events.rn", "=", 2),
      )
      .selectAll(["p", "current_ep"])
      .select([
        sql<boolean>`ranked_events.attendance_status = 'skipped'`.as(
          "was_admin_skipped_last_event",
        ),
      ])
      .where("current_ep.event_id", "=", currentEvent.id)
      .where("current_ep.is_user_applied", "=", true)

    const explainResult = await sql`EXPLAIN ANALYZE ${explainQuery}`.execute(
      kysely,
    )

    console.info("\n=== BASELINE QUERY PERFORMANCE (BEFORE OPTIMIZATION) ===")
    console.info(
      explainResult.rows.map((row) => (row as { "QUERY PLAN": string })["QUERY PLAN"]).join("\n"),
    )
    console.info("========================================================\n")

    // Extract execution time from EXPLAIN ANALYZE output
    const executionTimeLine = explainResult.rows.find((row) =>
      (row as { "QUERY PLAN": string })["QUERY PLAN"].includes("Execution Time"),
    )
    if (executionTimeLine) {
      console.info(`Baseline: ${(executionTimeLine as { "QUERY PLAN": string })["QUERY PLAN"]}`)
    }

    // Test still passes - we're just measuring performance
    expect(explainResult.rows.length).toBeGreaterThan(0)
  })

  it("should measure optimized query performance with EXPLAIN ANALYZE", async () => {
    // Create test data for performance measurement
    const profiles = []
    const events = []

    // Create multiple profiles
    for (let i = 0; i < 10; i++) {
      profiles.push(
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `test-query-opt-optimized-${i}@example.com`,
          full_name: `Test Profile Optimized ${i}`,
        }),
      )
    }

    // Create multiple events (past events for history)
    for (let i = 0; i < 5; i++) {
      events.push(
        await createTestEvent(tracker, kysely, {
          title: `Optimized Performance Test Event ${i}`,
          emoji: "⚡",
          location: `Location ${i}`,
          description: `Description ${i}`,
          event_status: "Completed",
          event_type: "regular",
          time_event_start: new Date(
            Date.now() - (60 - i * 10) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          time_event_end: new Date(
            Date.now() - (60 - i * 10) * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          ).toISOString(),
          time_application_start: new Date(
            Date.now() - (74 - i * 10) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          time_application_end: new Date(
            Date.now() - (62 - i * 10) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ticket_price: 100,
          total_spots: 50,
        }),
      )
    }

    // Create current event
    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Optimized Performance Test Event",
      emoji: "⚡",
      location: "Location Current",
      description: "Current Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_event_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 200,
      total_spots: 40,
    })

    // Create event participants for all profiles in all events
    for (const profile of profiles) {
      for (const event of events) {
        await createTestEventParticipant(tracker, kysely, {
          profile_id: profile.id,
          event_id: event.id,
          is_user_applied: true,
          application_status: "finalised",
          attendance_status: Math.random() > 0.5 ? "attended" : "skipped",
        })
      }

      // Add participation in current event
      await createTestEventParticipant(tracker, kysely, {
        profile_id: profile.id,
        event_id: currentEvent.id,
        is_user_applied: true,
        application_status: "pending",
        attendance_status: "pending",
      })
    }

    // Run EXPLAIN ANALYZE on the OPTIMIZED query (correlated subquery)
    const explainQuery = kysely
      .selectFrom("event_participants as current_ep")
      .innerJoin("profiles as p", "current_ep.profile_id", "p.id")
      .innerJoin("events as current_event", "current_ep.event_id", "current_event.id")
      .selectAll(["p", "current_ep"])
      .select((eb) => [
        eb
          .selectFrom("event_participants as ep")
          .innerJoin("events as e", "ep.event_id", "e.id")
          .select(sql<boolean>`ep.attendance_status = 'skipped'`.as("is_skipped"))
          .whereRef("ep.profile_id", "=", "current_ep.profile_id")
          .where("ep.is_user_applied", "=", true)
          .where("ep.application_status", "=", "finalised")
          .whereRef("e.time_event_start", "<", "current_event.time_event_start")
          .orderBy("e.time_event_start", "desc")
          .limit(1)
          .as("was_admin_skipped_last_event"),
      ])
      .where("current_ep.event_id", "=", currentEvent.id)
      .where("current_ep.is_user_applied", "=", true)

    const explainResult = await sql`EXPLAIN ANALYZE ${explainQuery}`.execute(
      kysely,
    )

    console.info("\n=== OPTIMIZED QUERY PERFORMANCE (AFTER OPTIMIZATION) ===")
    console.info(
      explainResult.rows.map((row) => (row as { "QUERY PLAN": string })["QUERY PLAN"]).join("\n"),
    )
    console.info("========================================================\n")

    // Extract execution time from EXPLAIN ANALYZE output
    const executionTimeLine = explainResult.rows.find((row) =>
      (row as { "QUERY PLAN": string })["QUERY PLAN"].includes("Execution Time"),
    )
    if (executionTimeLine) {
      console.info(`Optimized: ${(executionTimeLine as { "QUERY PLAN": string })["QUERY PLAN"]}`)
    }

    // Test still passes - we're just measuring performance
    expect(explainResult.rows.length).toBeGreaterThan(0)
  })

  it("should only consider finalized applications for was_admin_skipped_last_event", async () => {
    // Create profile with multiple past events:
    // - Most recent event: application_status = "pending" (should be IGNORED)
    // - Older event: application_status = "finalised" with attendance_status = "skipped" (should be USED)
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-query-opt-finalized-only@example.com",
      full_name: "Test Profile - Finalized Check",
    })

    // Oldest event (60 days ago) - finalised and skipped - THIS should be considered
    const oldestEvent = await createTestEvent(tracker, kysely, {
      title: "Oldest Event - Finalised",
      emoji: "📅",
      location: "Location 1",
      description: "Description 1",
      event_status: "Completed",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_event_end: new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date(
        Date.now() - 74 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_end: new Date(
        Date.now() - 62 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    // More recent event (30 days ago) - NOT finalised - THIS should be IGNORED
    const recentEvent = await createTestEvent(tracker, kysely, {
      title: "Recent Event - Not Finalised",
      emoji: "⏱️",
      location: "Location 2",
      description: "Description 2",
      event_status: "Completed",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_event_end: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date(
        Date.now() - 44 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_end: new Date(
        Date.now() - 32 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 150,
      total_spots: 30,
    })

    // Current event (30 days in future)
    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Event",
      emoji: "🎉",
      location: "Location 3",
      description: "Description 3",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_event_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 200,
      total_spots: 40,
    })

    // Oldest event: finalised and skipped
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: oldestEvent.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "skipped",
    })

    // Recent event: pending (not finalised) - even though attended, should be IGNORED
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: recentEvent.id,
      is_user_applied: true,
      application_status: "pending", // NOT finalised
      attendance_status: "attended", // Even though attended, should be ignored
    })

    // Current event: pending
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: currentEvent.id,
      is_user_applied: true,
      application_status: "pending",
      attendance_status: "pending",
    })

    const result = await getProfilesWithExtraDataById({
      eventId: currentEvent.id,
    })

    if (!result.success) {
      console.error("Query failed:", result.errors)
    }

    expect(result.success).toBe(true)

    if (result.success) {
      const profileData = result.data.find((p) => p.profile_id === profile.id)
      expect(profileData).toBeDefined()

      // Should return true (skipped) from oldestEvent, NOT false (attended) from recentEvent
      // Because recentEvent has application_status = "pending" (not finalised)
      expect(profileData?.was_admin_skipped_last_event).toBe(true)
    }
  })

  it("should correctly identify was_admin_skipped_last_event for edge cases", async () => {
    // Edge case 1: Profile with only current event (no history)
    const profileNoHistory = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-query-opt-edge-no-history@example.com",
      full_name: "Test Profile - No History Edge",
    })

    // Edge case 2: Profile with one past event that was not applied by user
    const profileNotUserApplied = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-query-opt-edge-not-user-applied@example.com",
      full_name: "Test Profile - Not User Applied Edge",
    })

    const pastEvent = await createTestEvent(tracker, kysely, {
      title: "Past Edge Event",
      emoji: "🔙",
      location: "Location Past",
      description: "Description Past",
      event_status: "Completed",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_event_end: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date(
        Date.now() - 44 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_end: new Date(
        Date.now() - 32 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Edge Event",
      emoji: "➡️",
      location: "Location Current",
      description: "Description Current",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      time_event_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      time_application_start: new Date().toISOString(),
      time_application_end: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ticket_price: 200,
      total_spots: 40,
    })

    // Profile 1: Only current event
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileNoHistory.id,
      event_id: currentEvent.id,
      is_user_applied: true,
      application_status: "pending",
      attendance_status: "pending",
    })

    // Profile 2: Has past event but is_user_applied = false (admin added)
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileNotUserApplied.id,
      event_id: pastEvent.id,
      is_user_applied: false, // Admin added, should NOT count for history
      application_status: "finalised",
      attendance_status: "skipped",
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profileNotUserApplied.id,
      event_id: currentEvent.id,
      is_user_applied: true,
      application_status: "pending",
      attendance_status: "pending",
    })

    const result = await getProfilesWithExtraDataById({
      eventId: currentEvent.id,
    })

    if (!result.success) {
      console.error("Query failed:", result.errors)
    }

    expect(result.success).toBe(true)

    if (result.success) {
      // Profile 1: No history, should be null or false
      const profile1Data = result.data.find(
        (p) => p.profile_id === profileNoHistory.id,
      )
      expect(profile1Data).toBeDefined()
      expect(
        profile1Data?.was_admin_skipped_last_event === null ||
          profile1Data?.was_admin_skipped_last_event === false,
      ).toBe(true)

      // Profile 2: Has past event but not user-applied, should be null or false
      const profile2Data = result.data.find(
        (p) => p.profile_id === profileNotUserApplied.id,
      )
      expect(profile2Data).toBeDefined()
      expect(
        profile2Data?.was_admin_skipped_last_event === null ||
          profile2Data?.was_admin_skipped_last_event === false,
      ).toBe(true)
    }
  })
})
