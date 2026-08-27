import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestProfile,
  createTestEvent,
  createTestEventParticipant,
} from "~/test/db-test-utils"
import { getKpiScores } from "./kpi-scores.server"

describe("getKpiScores - Extended KPI Data", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    // payments references event_participants ON DELETE RESTRICT, and the
    // seeds give the paid ones a ledger row.
    await kysely.deleteFrom("payments").execute()
    await kysely.deleteFrom("event_participants").execute()
    await kysely.deleteFrom("profiles").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return approved profiles count", async () => {
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "approved@test.com",
      approved_to_attend: "approved",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "pending@test.com",
      approved_to_attend: "pending",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "rejected@test.com",
      approved_to_attend: "rejected",
    })

    const result = await getKpiScores()

    expect(result.total_approved).toBe(1)
  })

  it("returns the total revenue in cents, though the column still holds reais", async () => {
    const payer = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "revenue@test.com",
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Revenue KPI Event",
      event_status: "Completed",
      time_event_start: new Date("2025-07-01").toISOString(),
      time_event_end: new Date("2025-07-01").toISOString(),
      ticket_price: 10000,
      total_spots: 10,
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: payer.id,
      event_id: event.id,
      has_paid: true,
      payment: 90,
    })

    const result = await getKpiScores()

    expect(result.total_revenue).toBe(9000)
  })

  it("should return flagged profiles count (yellow + red)", async () => {
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "yellow@test.com",
      flag: "yellow",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "red@test.com",
      flag: "red",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "none@test.com",
      flag: "none",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "gray@test.com",
      flag: "gray",
    })

    const result = await getKpiScores()

    expect(result.total_flagged).toBe(2)
  })

  it("should return count of profiles who attended 3+ events", async () => {
    // Create profiles with different attendance patterns
    const profile3Events = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "attended3@test.com",
    })
    const profile5Events = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "attended5@test.com",
    })
    const profile2Events = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "attended2@test.com",
    })

    // Create 6 completed events (July 2025 onwards)
    const events = await Promise.all(
      Array.from({ length: 6 }).map((_, i) =>
        createTestEvent(tracker, kysely, {
          title: `Test Event ${i + 1}`,
          event_status: "Completed",
          time_event_start: new Date(`2025-${String(i + 7).padStart(2, '0')}-01`).toISOString(),
          time_event_end: new Date(`2025-${String(i + 7).padStart(2, '0')}-01`).toISOString(),
          total_spots: 10,
          ticket_price: 10000,
        })
      )
    )

    // Profile 1: attended 3 events
    await Promise.all(
      events.slice(0, 3).map((event) =>
        createTestEventParticipant(tracker, kysely, {
          profile_id: profile3Events.id,
          event_id: event.id,
          attendance_status: "attended",
          payment: 100,
        })
      )
    )

    // Profile 2: attended 5 events
    await Promise.all(
      events.slice(0, 5).map((event) =>
        createTestEventParticipant(tracker, kysely, {
          profile_id: profile5Events.id,
          event_id: event.id,
          attendance_status: "attended",
          payment: 100,
        })
      )
    )

    // Profile 3: attended only 2 events (should not be counted)
    await Promise.all(
      events.slice(0, 2).map((event) =>
        createTestEventParticipant(tracker, kysely, {
          profile_id: profile2Events.id,
          event_id: event.id,
          attendance_status: "attended",
          payment: 100,
        })
      )
    )

    const result = await getKpiScores()

    expect(result.attended_3_plus).toBe(2) // profile3Events and profile5Events
  })

  it("should return count of profiles who attended 5+ events", async () => {
    // Create profile with 5+ attendances
    const profile5Plus = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "attended5plus@test.com",
    })
    const profile4 = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "attended4@test.com",
    })

    // Create 6 completed events (July 2025 onwards)
    const events = await Promise.all(
      Array.from({ length: 6 }).map((_, i) =>
        createTestEvent(tracker, kysely, {
          title: `Test Event ${i + 1}`,
          event_status: "Completed",
          time_event_start: new Date(`2025-${String(i + 7).padStart(2, '0')}-01`).toISOString(),
          time_event_end: new Date(`2025-${String(i + 7).padStart(2, '0')}-01`).toISOString(),
          total_spots: 10,
          ticket_price: 10000,
        })
      )
    )

    // Profile 1: attended 6 events
    await Promise.all(
      events.map((event) =>
        createTestEventParticipant(tracker, kysely, {
          profile_id: profile5Plus.id,
          event_id: event.id,
          attendance_status: "attended",
          payment: 100,
        })
      )
    )

    // Profile 2: attended only 4 events (should not be counted)
    await Promise.all(
      events.slice(0, 4).map((event) =>
        createTestEventParticipant(tracker, kysely, {
          profile_id: profile4.id,
          event_id: event.id,
          attendance_status: "attended",
          payment: 100,
        })
      )
    )

    const result = await getKpiScores()

    expect(result.attended_5_plus).toBe(1) // Only profile5Plus
  })

  it("should return average no-show rate as percentage", async () => {
    const result = await getKpiScores()

    expect(result.avg_no_show_rate).toBeTypeOf("number")
    expect(result.avg_no_show_rate).toBeGreaterThanOrEqual(0)
    expect(result.avg_no_show_rate).toBeLessThanOrEqual(100)
  })
})
