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
import {
  getGrowthData,
  getRetentionData,
  getSeasonalityData,
} from "./growth-retention.server"
import type { EventStatus } from "~types/database/entities.types"

describe("Growth and Retention DataViz - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const testPrefix = `growth-retention-${Date.now()}`

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

  describe("getGrowthData", () => {
    it("should return monthly profile growth with cumulative counts", async () => {
      // Create profiles in different months
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-jan1@test.com`,
        created_at: "2024-01-15T10:00:00Z",
      })
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-jan2@test.com`,
        created_at: "2024-01-20T10:00:00Z",
      })
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-feb1@test.com`,
        created_at: "2024-02-10T10:00:00Z",
      })
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-mar1@test.com`,
        created_at: "2024-03-05T10:00:00Z",
      })
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-mar2@test.com`,
        created_at: "2024-03-15T10:00:00Z",
      })

      const result = await getGrowthData()

      // Find our test months
      const jan = result.find((r) => r.month.startsWith("2024-01"))
      const feb = result.find((r) => r.month.startsWith("2024-02"))
      const mar = result.find((r) => r.month.startsWith("2024-03"))

      expect(jan).toBeDefined()
      expect(jan!.new_profiles).toBe(2)

      expect(feb).toBeDefined()
      expect(feb!.new_profiles).toBe(1)

      expect(mar).toBeDefined()
      expect(mar!.new_profiles).toBe(2)

      // Cumulative should be increasing
      expect(mar!.cumulative).toBeGreaterThan(jan!.cumulative)
    })

    it("should return results ordered by month ascending", async () => {
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-order1@test.com`,
        created_at: "2024-06-15T10:00:00Z",
      })
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-order2@test.com`,
        created_at: "2024-03-15T10:00:00Z",
      })

      const result = await getGrowthData()

      // March should come before June
      const marchIdx = result.findIndex((r) => r.month.startsWith("2024-03"))
      const juneIdx = result.findIndex((r) => r.month.startsWith("2024-06"))

      if (marchIdx !== -1 && juneIdx !== -1) {
        expect(marchIdx).toBeLessThan(juneIdx)
      }
    })
  })

  describe("getRetentionData", () => {
    it("should calculate how many people attended N events", async () => {
      // Create completed events
      const event1 = await createTestEvent(tracker, kysely, {
        title: "Event 1",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
      })
      const event2 = await createTestEvent(tracker, kysely, {
        title: "Event 2",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-02-15T19:00:00Z").toISOString(),
      })
      const event3 = await createTestEvent(tracker, kysely, {
        title: "Event 3",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-03-15T19:00:00Z").toISOString(),
      })

      // Profile that attended 3 events
      const profile3Events = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-3events@test.com`,
      })

      // Profile that attended 2 events
      const profile2Events = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-2events@test.com`,
      })

      // Profile that attended 1 event
      const profile1Event = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-1event@test.com`,
      })

      // Another profile that attended 1 event
      const profile1EventB = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-1eventB@test.com`,
      })

      // Create attendance records
      await createTestEventParticipant(tracker, kysely, {
        event_id: event1.id,
        profile_id: profile3Events.id,
        attendance_status: "attended",
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event2.id,
        profile_id: profile3Events.id,
        attendance_status: "attended",
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event3.id,
        profile_id: profile3Events.id,
        attendance_status: "attended",
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: event1.id,
        profile_id: profile2Events.id,
        attendance_status: "attended",
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event2.id,
        profile_id: profile2Events.id,
        attendance_status: "attended",
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: event1.id,
        profile_id: profile1Event.id,
        attendance_status: "attended",
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: event2.id,
        profile_id: profile1EventB.id,
        attendance_status: "attended",
      })

      const result = await getRetentionData()

      const oneEvent = result.find((r) => r.events_attended === 1)
      const twoEvents = result.find((r) => r.events_attended === 2)
      const threeEvents = result.find((r) => r.events_attended === 3)

      expect(oneEvent).toBeDefined()
      expect(oneEvent!.num_people).toBe(2)

      expect(twoEvents).toBeDefined()
      expect(twoEvents!.num_people).toBe(1)

      expect(threeEvents).toBeDefined()
      expect(threeEvents!.num_people).toBe(1)
    })

    it("should only count attendance at completed events", async () => {
      const completedEvent = await createTestEvent(tracker, kysely, {
        title: "Completed",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
      })
      const draftEvent = await createTestEvent(tracker, kysely, {
        title: "Draft",
        event_status: "Draft" as EventStatus,
        time_event_start: new Date("2024-02-15T19:00:00Z").toISOString(),
      })

      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-retention@test.com`,
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profile.id,
        attendance_status: "attended",
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: draftEvent.id,
        profile_id: profile.id,
        attendance_status: "attended",
      })

      const result = await getRetentionData()

      // Should only count the completed event
      const oneEvent = result.find((r) => r.events_attended === 1)
      expect(oneEvent).toBeDefined()
      expect(oneEvent!.num_people).toBe(1)

      const twoEvents = result.find((r) => r.events_attended === 2)
      expect(twoEvents).toBeUndefined()
    })
  })

  describe("getSeasonalityData", () => {
    it("should calculate average metrics by month", async () => {
      // Create events in same month across different years
      const jan2023Event = await createTestEvent(tracker, kysely, {
        title: "Jan 2023",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2023-01-15T19:00:00Z").toISOString(),
        total_spots: 50,
      })
      const jan2024Event = await createTestEvent(tracker, kysely, {
        title: "Jan 2024",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
        total_spots: 50,
      })

      const profile1 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-season1@test.com`,
      })
      const profile2 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-season2@test.com`,
      })

      // Jan 2023: 1 inscrito, 1 compareceu
      await createTestEventParticipant(tracker, kysely, {
        event_id: jan2023Event.id,
        profile_id: profile1.id,
        attendance_status: "attended",
      })

      // Jan 2024: 2 inscritos, 1 compareceu
      await createTestEventParticipant(tracker, kysely, {
        event_id: jan2024Event.id,
        profile_id: profile1.id,
        attendance_status: "attended",
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: jan2024Event.id,
        profile_id: profile2.id,
        attendance_status: "not-attended",
      })

      const result = await getSeasonalityData()

      const january = result.find((r) => r.month_name === "January")
      expect(january).toBeDefined()
      // Average inscritos: (1 + 2) / 2 = 1.5 -> rounded to 2
      expect(january!.avg_inscritos).toBeGreaterThanOrEqual(1)
      // Average compareceram: (1 + 1) / 2 = 1
      expect(january!.avg_compareceram).toBeGreaterThanOrEqual(1)
    })

    it("should return all 12 months when data exists", async () => {
      // Create at least one event per month
      for (let month = 1; month <= 12; month++) {
        await createTestEvent(tracker, kysely, {
          title: `Month ${month}`,
          event_status: "Completed" as EventStatus,
          time_event_start: new Date(
            `2024-${String(month).padStart(2, "0")}-15T19:00:00Z`
          ).toISOString(),
          total_spots: 50,
        })
      }

      const result = await getSeasonalityData()

      expect(result.length).toBe(12)
    })
  })
})
