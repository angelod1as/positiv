import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { sql } from "kysely"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"
import {
  getProfilesWithExtraDataById,
  profilesWithExtraDataByIdQuery,
} from "./admin.server"

type PlanNode = {
  "Node Type": string
  Alias?: string
  "Index Name"?: string
  Plans?: PlanNode[]
}

function flattenPlan(node: PlanNode): PlanNode[] {
  return [node, ...(node.Plans ?? []).flatMap(flattenPlan)]
}

function indexesUsedBy(nodes: PlanNode[], alias: string): string[] {
  return nodes
    .filter((node) => node.Alias === alias)
    .flatMap(flattenPlan)
    .flatMap((node) => (node["Index Name"] ? [node["Index Name"]] : []))
}

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
      ticket_price: 10000,
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
      ticket_price: 15000,
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
      ticket_price: 20000,
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

  it("should plan the history lookup through the POS-275 index, without a window function", async () => {
    const profiles = []
    for (let i = 0; i < 3; i++) {
      profiles.push(
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `test-query-opt-plan-${i}@example.com`,
          full_name: `Test Profile Plan ${i}`,
        }),
      )
    }

    const pastEvents = []
    for (let i = 0; i < 2; i++) {
      pastEvents.push(
        await createTestEvent(tracker, kysely, {
          title: `Plan Test Event ${i}`,
          emoji: "🎯",
          location: `Location ${i}`,
          description: `Description ${i}`,
          event_status: "Completed",
          event_type: "regular",
          time_event_start: new Date(
            Date.now() - (60 - i * 30) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          time_event_end: new Date(
            Date.now() - (60 - i * 30) * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          ).toISOString(),
          time_application_start: new Date(
            Date.now() - (74 - i * 30) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ticket_price: 10000,
          total_spots: 50,
        }),
      )
    }

    const currentEvent = await createTestEvent(tracker, kysely, {
      title: "Current Plan Test Event",
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
      ticket_price: 20000,
      total_spots: 40,
    })

    for (const [profileIndex, profile] of profiles.entries()) {
      for (const [eventIndex, event] of pastEvents.entries()) {
        await createTestEventParticipant(tracker, kysely, {
          profile_id: profile.id,
          event_id: event.id,
          is_user_applied: true,
          application_status: "finalised",
          attendance_status:
            (profileIndex + eventIndex) % 2 === 0 ? "attended" : "skipped",
        })
      }

      await createTestEventParticipant(tracker, kysely, {
        profile_id: profile.id,
        event_id: currentEvent.id,
        is_user_applied: true,
        application_status: "pending",
        attendance_status: "pending",
      })
    }

    const plan = await kysely.transaction().execute(async (trx) => {
      await sql`SET LOCAL enable_seqscan = off`.execute(trx)
      const { rows } = await sql<{
        "QUERY PLAN": [{ Plan: PlanNode }]
      }>`EXPLAIN (FORMAT JSON) ${profilesWithExtraDataByIdQuery(currentEvent.id)}`.execute(
        trx,
      )
      return rows[0]["QUERY PLAN"][0].Plan
    })

    const nodes = flattenPlan(plan)

    expect(nodes.map((node) => node["Node Type"])).not.toContain("WindowAgg")
    // Matched on the whole plan, not the "ep" alias: the joined
    // event_participant_payments view has its own "ep", so Postgres renames ours
    expect(nodes.map((node) => node["Index Name"])).toContain(
      "idx_event_participants_profile_history",
    )
    expect(indexesUsedBy(nodes, "current_ep")).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^idx_event_participants_event_id/),
      ]),
    )
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
      ticket_price: 10000,
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
      ticket_price: 15000,
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
      ticket_price: 20000,
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
      ticket_price: 10000,
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
      ticket_price: 20000,
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
