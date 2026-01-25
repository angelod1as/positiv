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
  getEventAttendanceData,
  getEventRevenueData,
  getConversionFunnelData,
  getOccupancyData,
} from "./event-metrics.server"
import type { EventStatus } from "~types/database/entities.types"

describe("Event Metrics - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const testPrefix = `event-metrics-${Date.now()}`

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

  describe("getEventAttendanceData", () => {
    it("should return attendance data for completed events only", async () => {
      const completedEvent = await createTestEvent(tracker, kysely, {
        title: "Completed Event",
        emoji: "🎉",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
        total_spots: 50,
      })

      const draftEvent = await createTestEvent(tracker, kysely, {
        title: "Draft Event",
        emoji: "📝",
        event_status: "Draft" as EventStatus,
        time_event_start: new Date("2024-02-15T19:00:00Z").toISOString(),
      })

      const profile1 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-p1@test.com`,
      })
      const profile2 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-p2@test.com`,
      })
      const profile3 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-p3@test.com`,
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profile1.id,
        attendance_status: "attended",
        application_status: "finalised",
        spot_type: "regular",
        has_paid: true,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profile2.id,
        attendance_status: "not-attended",
        application_status: "finalised",
        spot_type: "regular",
        has_paid: true,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profile3.id,
        attendance_status: "pending",
        application_status: "finalised",
        spot_type: "social",
        has_paid: false,
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: draftEvent.id,
        profile_id: profile1.id,
        attendance_status: "pending",
        application_status: "pending",
      })

      const result = await getEventAttendanceData()

      expect(result.length).toBe(1)
      expect(result[0].title).toBe("Completed Event")
      expect(result[0].emoji).toBe("🎉")
      expect(result[0].inscritos).toBe(3)
      expect(result[0].compareceram).toBe(1)
      expect(result[0].nao_foram).toBe(1)
      expect(result[0].vagas_sociais).toBe(1)
    })

    it("should return events ordered by time_event_start ascending", async () => {
      const event1 = await createTestEvent(tracker, kysely, {
        title: "First Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-01T19:00:00Z").toISOString(),
      })
      const event2 = await createTestEvent(tracker, kysely, {
        title: "Second Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-02-01T19:00:00Z").toISOString(),
      })
      const event3 = await createTestEvent(tracker, kysely, {
        title: "Third Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
      })

      const result = await getEventAttendanceData()

      expect(result.length).toBe(3)
      expect(result[0].title).toBe("First Event")
      expect(result[1].title).toBe("Third Event")
      expect(result[2].title).toBe("Second Event")
    })

    it("should count attendance statuses correctly", async () => {
      const uniqueTitle = `Status Count Test ${testPrefix}`
      const event = await createTestEvent(tracker, kysely, {
        title: uniqueTitle,
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-03-01T19:00:00Z").toISOString(),
      })

      const profiles = await Promise.all([
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-attended@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-notattended@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-skipped@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-willnotgo@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-rodizio@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-staff@test.com`,
        }),
      ])

      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profiles[0].id,
        attendance_status: "attended",
        spot_type: "regular",
        was_selected_for_rotation: false,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profiles[1].id,
        attendance_status: "not-attended",
        spot_type: "regular",
        was_selected_for_rotation: false,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profiles[2].id,
        attendance_status: "skipped",
        spot_type: "regular",
        was_selected_for_rotation: false,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profiles[3].id,
        attendance_status: "will-not-go",
        spot_type: "regular",
        was_selected_for_rotation: false,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profiles[4].id,
        attendance_status: "attended",
        spot_type: "regular",
        was_selected_for_rotation: true,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profiles[5].id,
        attendance_status: "attended",
        spot_type: "staff",
        was_selected_for_rotation: false,
      })

      const result = await getEventAttendanceData()
      const eventResult = result.find((e) => e.title === uniqueTitle)

      expect(eventResult).toBeDefined()
      expect(eventResult!.inscritos).toBe(6)
      expect(eventResult!.compareceram).toBe(3)
      expect(eventResult!.nao_foram).toBe(1)
      expect(eventResult!.skipped).toBe(1)
      expect(eventResult!.will_not_go).toBe(1)
      // rodizio is 2: 1 explicit + 1 from skipped (trigger auto-sets was_selected_for_rotation=true on skipped)
      expect(eventResult!.rodizio).toBe(2)
      expect(eventResult!.staff).toBe(1)
    })

    it("should handle events with no participants", async () => {
      await createTestEvent(tracker, kysely, {
        title: "Empty Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-04-01T19:00:00Z").toISOString(),
      })

      const result = await getEventAttendanceData()
      const emptyEvent = result.find((e) => e.title === "Empty Event")

      expect(emptyEvent).toBeDefined()
      expect(emptyEvent!.inscritos).toBe(0)
      expect(emptyEvent!.compareceram).toBe(0)
      expect(emptyEvent!.nao_foram).toBe(0)
    })
  })

  describe("getEventRevenueData", () => {
    it("should return revenue data for completed events only", async () => {
      const completedEvent = await createTestEvent(tracker, kysely, {
        title: "Revenue Event",
        emoji: "💰",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
        ticket_price: 100,
      })

      const draftEvent = await createTestEvent(tracker, kysely, {
        title: "Draft Event",
        event_status: "Draft" as EventStatus,
        time_event_start: new Date("2024-02-15T19:00:00Z").toISOString(),
        ticket_price: 200,
      })

      const profile1 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-rev1@test.com`,
      })
      const profile2 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-rev2@test.com`,
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profile1.id,
        has_paid: true,
        payment: 100,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profile2.id,
        has_paid: true,
        payment: 80,
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: draftEvent.id,
        profile_id: profile1.id,
        has_paid: true,
        payment: 200,
      })

      const result = await getEventRevenueData()

      expect(result.length).toBe(1)
      expect(result[0].title).toBe("Revenue Event")
      expect(result[0].emoji).toBe("💰")
      expect(result[0].faturamento_total).toBe(180)
      expect(result[0].ticket_price).toBe(100)
      expect(result[0].num_pagantes).toBe(2)
    })

    it("should calculate revenue correctly with mixed payment statuses", async () => {
      const event = await createTestEvent(tracker, kysely, {
        title: "Mixed Payments Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-03-01T19:00:00Z").toISOString(),
        ticket_price: 150,
      })

      const profiles = await Promise.all([
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-paid1@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-paid2@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-notpaid@test.com`,
        }),
      ])

      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profiles[0].id,
        has_paid: true,
        payment: 150,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profiles[1].id,
        has_paid: true,
        payment: 120,
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profiles[2].id,
        has_paid: false,
        payment: 0,
      })

      const result = await getEventRevenueData()
      const eventResult = result.find((e) => e.title === "Mixed Payments Event")

      expect(eventResult).toBeDefined()
      expect(eventResult!.faturamento_total).toBe(270)
      expect(eventResult!.num_pagantes).toBe(2)
    })

    it("should handle events with no participants", async () => {
      await createTestEvent(tracker, kysely, {
        title: "Empty Revenue Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-04-01T19:00:00Z").toISOString(),
        ticket_price: 100,
      })

      const result = await getEventRevenueData()
      const emptyEvent = result.find((e) => e.title === "Empty Revenue Event")

      expect(emptyEvent).toBeDefined()
      expect(emptyEvent!.faturamento_total).toBe(0)
      expect(emptyEvent!.num_pagantes).toBe(0)
      expect(emptyEvent!.ticket_price).toBe(100)
    })

    it("should return events ordered by time_event_start ascending", async () => {
      await createTestEvent(tracker, kysely, {
        title: "First Revenue",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-01T19:00:00Z").toISOString(),
      })
      await createTestEvent(tracker, kysely, {
        title: "Second Revenue",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-02-01T19:00:00Z").toISOString(),
      })
      await createTestEvent(tracker, kysely, {
        title: "Third Revenue",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
      })

      const result = await getEventRevenueData()

      expect(result.length).toBe(3)
      expect(result[0].title).toBe("First Revenue")
      expect(result[1].title).toBe("Third Revenue")
      expect(result[2].title).toBe("Second Revenue")
    })
  })

  describe("getConversionFunnelData", () => {
    it("should calculate conversion funnel for completed events only", async () => {
      const completedEvent = await createTestEvent(tracker, kysely, {
        title: "Funnel Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
      })

      const draftEvent = await createTestEvent(tracker, kysely, {
        title: "Draft Event",
        event_status: "Draft" as EventStatus,
        time_event_start: new Date("2024-02-15T19:00:00Z").toISOString(),
      })

      const profiles = await Promise.all([
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-funnel1@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-funnel2@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-funnel3@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-funnel4@test.com`,
        }),
      ])

      // Profile 1: finalised, paid, attended
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profiles[0].id,
        application_status: "finalised",
        has_paid: true,
        attendance_status: "attended",
      })
      // Profile 2: finalised, paid, not attended
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profiles[1].id,
        application_status: "finalised",
        has_paid: true,
        attendance_status: "not-attended",
      })
      // Profile 3: finalised, not paid
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profiles[2].id,
        application_status: "finalised",
        has_paid: false,
        attendance_status: "pending",
      })
      // Profile 4: pending (not finalised)
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profiles[3].id,
        application_status: "pending",
        has_paid: false,
        attendance_status: "pending",
      })

      // Draft event participant (should not be counted)
      await createTestEventParticipant(tracker, kysely, {
        event_id: draftEvent.id,
        profile_id: profiles[0].id,
        application_status: "finalised",
        has_paid: true,
        attendance_status: "attended",
      })

      const result = await getConversionFunnelData()

      expect(result.length).toBe(1)
      expect(result[0].title).toBe("Funnel Event")
      expect(result[0].inscritos).toBe(4)
      expect(result[0].finalizados).toBe(3)
      expect(result[0].pagaram).toBe(2)
      expect(result[0].compareceram).toBe(1)
      expect(result[0].pct_finalizados).toBe(75)
      expect(result[0].pct_pagaram).toBe(50)
      expect(result[0].pct_compareceram).toBe(25)
    })

    it("should handle events with no participants", async () => {
      await createTestEvent(tracker, kysely, {
        title: "Empty Funnel Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-04-01T19:00:00Z").toISOString(),
      })

      const result = await getConversionFunnelData()
      const emptyEvent = result.find((e) => e.title === "Empty Funnel Event")

      expect(emptyEvent).toBeDefined()
      expect(emptyEvent!.inscritos).toBe(0)
      expect(emptyEvent!.finalizados).toBe(0)
      expect(emptyEvent!.pagaram).toBe(0)
      expect(emptyEvent!.compareceram).toBe(0)
      expect(emptyEvent!.pct_finalizados).toBe(0)
      expect(emptyEvent!.pct_pagaram).toBe(0)
      expect(emptyEvent!.pct_compareceram).toBe(0)
    })

    it("should return events ordered by time_event_start ascending", async () => {
      await createTestEvent(tracker, kysely, {
        title: "First Funnel",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-01T19:00:00Z").toISOString(),
      })
      await createTestEvent(tracker, kysely, {
        title: "Second Funnel",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-02-01T19:00:00Z").toISOString(),
      })
      await createTestEvent(tracker, kysely, {
        title: "Third Funnel",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
      })

      const result = await getConversionFunnelData()

      expect(result.length).toBe(3)
      expect(result[0].title).toBe("First Funnel")
      expect(result[1].title).toBe("Third Funnel")
      expect(result[2].title).toBe("Second Funnel")
    })
  })

  describe("getOccupancyData", () => {
    it("should calculate occupancy for completed events only", async () => {
      const completedEvent = await createTestEvent(tracker, kysely, {
        title: "Occupancy Event",
        emoji: "📊",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
        total_spots: 50,
      })

      const draftEvent = await createTestEvent(tracker, kysely, {
        title: "Draft Event",
        event_status: "Draft" as EventStatus,
        time_event_start: new Date("2024-02-15T19:00:00Z").toISOString(),
        total_spots: 100,
      })

      const profiles = await Promise.all([
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-occ1@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-occ2@test.com`,
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-occ3@test.com`,
        }),
      ])

      // 2 attended out of 50 spots = 4%
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profiles[0].id,
        attendance_status: "attended",
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profiles[1].id,
        attendance_status: "attended",
      })
      await createTestEventParticipant(tracker, kysely, {
        event_id: completedEvent.id,
        profile_id: profiles[2].id,
        attendance_status: "not-attended",
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: draftEvent.id,
        profile_id: profiles[0].id,
        attendance_status: "attended",
      })

      const result = await getOccupancyData()

      expect(result.length).toBe(1)
      expect(result[0].title).toBe("Occupancy Event")
      expect(result[0].emoji).toBe("📊")
      expect(result[0].compareceram).toBe(2)
      expect(result[0].total_spots).toBe(50)
      expect(result[0].occupancy_pct).toBe(4)
    })

    it("should handle events with null total_spots", async () => {
      const event = await createTestEvent(tracker, kysely, {
        title: "No Spots Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-03-01T19:00:00Z").toISOString(),
        total_spots: null,
      })

      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-nullspots@test.com`,
      })

      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
        attendance_status: "attended",
      })

      const result = await getOccupancyData()
      const eventResult = result.find((e) => e.title === "No Spots Event")

      expect(eventResult).toBeDefined()
      expect(eventResult!.compareceram).toBe(1)
      expect(eventResult!.total_spots).toBe(0)
      expect(eventResult!.occupancy_pct).toBe(0)
    })

    it("should handle events with no participants", async () => {
      await createTestEvent(tracker, kysely, {
        title: "Empty Occupancy Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-04-01T19:00:00Z").toISOString(),
        total_spots: 100,
      })

      const result = await getOccupancyData()
      const emptyEvent = result.find((e) => e.title === "Empty Occupancy Event")

      expect(emptyEvent).toBeDefined()
      expect(emptyEvent!.compareceram).toBe(0)
      expect(emptyEvent!.total_spots).toBe(100)
      expect(emptyEvent!.occupancy_pct).toBe(0)
    })

    it("should return events ordered by time_event_start ascending", async () => {
      await createTestEvent(tracker, kysely, {
        title: "First Occupancy",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-01T19:00:00Z").toISOString(),
        total_spots: 50,
      })
      await createTestEvent(tracker, kysely, {
        title: "Second Occupancy",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-02-01T19:00:00Z").toISOString(),
        total_spots: 50,
      })
      await createTestEvent(tracker, kysely, {
        title: "Third Occupancy",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
        total_spots: 50,
      })

      const result = await getOccupancyData()

      expect(result.length).toBe(3)
      expect(result[0].title).toBe("First Occupancy")
      expect(result[1].title).toBe("Third Occupancy")
      expect(result[2].title).toBe("Second Occupancy")
    })
  })
})
