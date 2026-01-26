import { describe, expect, it, beforeEach, afterEach } from "vitest"
import {
  setupIntegrationTest,
  cleanupAfterTest,
} from "~/test/integration-setup"
import {
  createTestProfile,
  createTestEvent,
  createTestEventParticipant,
} from "~/test/db-test-utils"
import { getKpiScores } from "./kpi-scores.server"
import type { EventStatus } from "~types/database/entities.types"

describe("KPI Scores - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const testPrefix = `kpi-scores-${Date.now()}`

  beforeEach(async () => {
    tracker.clear()
    await kysely.deleteFrom("event_participants").execute()
    await kysely
      .updateTable("events")
      .set({ event_status: "Draft" })
      .where("event_status", "=", "Completed")
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("getKpiScores", () => {
    it("should return all KPI metrics with correct values", async () => {
      // Create profiles (2 veterans, 1 non-veteran)
      const veteran1 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-vet1@test.com`,
        became_veteran_date: new Date("2024-01-01T00:00:00Z").toISOString(),
      })
      const veteran2 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-vet2@test.com`,
        became_veteran_date: new Date("2024-01-01T00:00:00Z").toISOString(),
      })
      const nonVeteran = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-nonvet@test.com`,
        became_veteran_date: null,
      })

      // Create completed events (2 completed, 1 draft)
      const event1 = await createTestEvent(tracker, kysely, {
        title: "KPI Event 1",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
        total_spots: 50,
        ticket_price: 100,
      })
      const event2 = await createTestEvent(tracker, kysely, {
        title: "KPI Event 2",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-02-15T19:00:00Z").toISOString(),
        total_spots: 40,
        ticket_price: 150,
      })
      // Draft event should not be counted
      await createTestEvent(tracker, kysely, {
        title: "Draft Event",
        event_status: "Draft" as EventStatus,
        time_event_start: new Date("2024-03-15T19:00:00Z").toISOString(),
        total_spots: 30,
        ticket_price: 200,
      })

      // Event 1: veteran1 and nonVeteran attended, paid
      await createTestEventParticipant(tracker, kysely, {
        event_id: event1.id,
        profile_id: veteran1.id,
        attendance_status: "attended",
        has_paid: true,
        payment: 100,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event1.id,
        profile_id: nonVeteran.id,
        attendance_status: "attended",
        has_paid: true,
        payment: 100,
      })

      // Event 2: veteran1 and veteran2 attended, paid
      await createTestEventParticipant(tracker, kysely, {
        event_id: event2.id,
        profile_id: veteran1.id,
        attendance_status: "attended",
        has_paid: true,
        payment: 150,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event2.id,
        profile_id: veteran2.id,
        attendance_status: "attended",
        has_paid: true,
        payment: 150,
      })

      const result = await getKpiScores()

      // Profile counts include existing data, so use at least the test data
      expect(result.total_profiles).toBeGreaterThanOrEqual(3)
      expect(result.total_veterans).toBeGreaterThanOrEqual(2)

      // Event counts (beforeEach resets all to Draft, so these are absolute)
      expect(result.total_events_completed).toBe(2)

      // Unique attendees: veteran1, veteran2, nonVeteran = 3 (absolute since events reset)
      expect(result.total_unique_attendees).toBe(3)

      // Average attendance: (2 + 2) / 2 events = 2
      expect(result.avg_attendance_per_event).toBe(2)

      // Average occupancy: Event 1: 2/50=4%, Event 2: 2/40=5% => avg = 4.5% rounded to 5%
      expect(result.avg_occupancy_pct).toBeGreaterThanOrEqual(4)
      expect(result.avg_occupancy_pct).toBeLessThanOrEqual(5)

      // Total revenue: 100 + 100 + 150 + 150 = 500
      expect(result.total_revenue).toBe(500)

      // Average revenue per event: 500 / 2 = 250
      expect(result.avg_revenue_per_event).toBe(250)

      // Average ticket price: (100 + 150) / 2 = 125
      expect(result.avg_ticket_price).toBe(125)
    })

    it("should return zeros for event metrics when no completed events exist", async () => {
      // beforeEach already resets all events to Draft
      const result = await getKpiScores()

      // Event-related metrics should be zero (no completed events)
      expect(result.total_events_completed).toBe(0)
      expect(result.total_unique_attendees).toBe(0)
      expect(result.avg_attendance_per_event).toBe(0)
      expect(result.avg_occupancy_pct).toBe(0)
      expect(result.total_revenue).toBe(0)
      expect(result.avg_revenue_per_event).toBe(0)
      expect(result.avg_ticket_price).toBe(0)

      // Profile metrics may have existing data, just check they are numbers
      expect(typeof result.total_profiles).toBe("number")
      expect(typeof result.total_veterans).toBe("number")
    })

    it("should only count completed events for event-related metrics", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-only-completed@test.com`,
      })

      const completedEvent = await createTestEvent(tracker, kysely, {
        title: "Completed",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
        total_spots: 50,
        ticket_price: 100,
      })
      const draftEvent = await createTestEvent(tracker, kysely, {
        title: "Draft",
        event_status: "Draft" as EventStatus,
        time_event_start: new Date("2024-02-15T19:00:00Z").toISOString(),
        total_spots: 50,
        ticket_price: 200,
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profile.id,
        attendance_status: "attended",
        has_paid: true,
        payment: 100,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: draftEvent.id,
        profile_id: profile.id,
        attendance_status: "attended",
        has_paid: true,
        payment: 200,
      })

      const result = await getKpiScores()

      // Only completed event should be counted
      expect(result.total_events_completed).toBe(1)
      expect(result.total_unique_attendees).toBe(1)
      expect(result.total_revenue).toBe(100)
      expect(result.avg_ticket_price).toBe(100)
    })

    it("should handle events with zero total_spots in occupancy calculation", async () => {
      // Event with zero spots - occupancy should be excluded from average
      await createTestEvent(tracker, kysely, {
        title: "Zero Spots Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
        total_spots: 0,
        ticket_price: 100,
      })

      const result = await getKpiScores()

      // Should not throw, occupancy should be 0 or excluded from average
      expect(result.avg_occupancy_pct).toBe(0)
    })
  })
})
