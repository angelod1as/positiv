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
  getVeteranRookieData,
  getDemographicsData,
} from "./demographics-dataviz.server"
import {
  getEventAttendanceData,
  getEventRevenueData,
  getConversionFunnelData,
  getOccupancyData,
} from "./event-metrics.server"
import {
  getGrowthData,
  getRetentionData,
  getSeasonalityData,
} from "./growth-retention.server"
import { getKpiScores } from "./kpi-scores.server"
import type { EventStatus } from "~types/database/entities.types"

describe("DataViz - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const testPrefix = `dataviz-${Date.now()}`

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

  describe("Demographics DataViz", () => {
    describe("getVeteranRookieData", () => {
      it("should calculate veterans and rookies for completed events only", async () => {
        const eventDate = new Date("2025-12-01T19:00:00Z")
        const completedEvent = await createTestEvent(tracker, kysely, {
          title: "Veteran Rookie Event",
          emoji: "🎖️",
          event_status: "Completed" as EventStatus,
          time_event_start: eventDate.toISOString(),
        })

        const draftEvent = await createTestEvent(tracker, kysely, {
          title: "Draft Event",
          event_status: "Draft" as EventStatus,
          time_event_start: new Date("2025-07-01T19:00:00Z").toISOString(),
        })

        // Veteran: became veteran BEFORE the event date
        const veteranProfile = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-veteran@test.com`,
          became_veteran_date: new Date("2025-07-01T00:00:00Z").toISOString(),
        })

        // Rookie: null became_veteran_date
        const rookieProfile1 = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-rookie1@test.com`,
          became_veteran_date: null,
        })

        // Rookie: became veteran AFTER the event date
        const rookieProfile2 = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-rookie2@test.com`,
          became_veteran_date: new Date("2026-01-01T00:00:00Z").toISOString(),
        })

        await createTestEventParticipant(tracker, kysely, {
          event_id: completedEvent.id,
          profile_id: veteranProfile.id,
          attendance_status: "attended",
        })
        await createTestEventParticipant(tracker, kysely, {
          event_id: completedEvent.id,
          profile_id: rookieProfile1.id,
          attendance_status: "attended",
        })
        await createTestEventParticipant(tracker, kysely, {
          event_id: completedEvent.id,
          profile_id: rookieProfile2.id,
          attendance_status: "attended",
        })

        // Draft event participant (should not be counted)
        await createTestEventParticipant(tracker, kysely, {
          event_id: draftEvent.id,
          profile_id: veteranProfile.id,
          attendance_status: "attended",
        })

        const result = await getVeteranRookieData()

        expect(result.length).toBe(1)
        expect(result[0].title).toBe("Veteran Rookie Event")
        expect(result[0].emoji).toBe("🎖️")
        expect(result[0].veterans).toBe(1)
        expect(result[0].rookies).toBe(2)
      })

      it("should only count attended participants", async () => {
        const eventDate = new Date("2025-12-01T19:00:00Z")
        const event = await createTestEvent(tracker, kysely, {
          title: "Attendance Filter Event",
          event_status: "Completed" as EventStatus,
          time_event_start: eventDate.toISOString(),
        })

        const veteranProfile = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-vet-attended@test.com`,
          became_veteran_date: new Date("2025-07-01T00:00:00Z").toISOString(),
        })

        const rookieProfile = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-rookie-notattended@test.com`,
          became_veteran_date: null,
        })

        await createTestEventParticipant(tracker, kysely, {
          event_id: event.id,
          profile_id: veteranProfile.id,
          attendance_status: "attended",
        })
        await createTestEventParticipant(tracker, kysely, {
          event_id: event.id,
          profile_id: rookieProfile.id,
          attendance_status: "not-attended",
        })

        const result = await getVeteranRookieData()
        const eventResult = result.find(
          (e) => e.title === "Attendance Filter Event"
        )

        expect(eventResult).toBeDefined()
        if (eventResult) {
          expect(eventResult.veterans).toBe(1)
          expect(eventResult.rookies).toBe(0)
        }
      })

      it("should handle events with no participants", async () => {
        await createTestEvent(tracker, kysely, {
          title: "Empty Veteran Rookie Event",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-10-01T19:00:00Z").toISOString(),
        })

        const result = await getVeteranRookieData()
        const emptyEvent = result.find(
          (e) => e.title === "Empty Veteran Rookie Event"
        )

        expect(emptyEvent).toBeDefined()
        if (emptyEvent) {
          expect(emptyEvent.veterans).toBe(0)
          expect(emptyEvent.rookies).toBe(0)
        }
      })

      it("should return events ordered by time_event_start ascending", async () => {
        await createTestEvent(tracker, kysely, {
          title: "First VR",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-01T19:00:00Z").toISOString(),
        })
        await createTestEvent(tracker, kysely, {
          title: "Second VR",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-08-01T19:00:00Z").toISOString(),
        })
        await createTestEvent(tracker, kysely, {
          title: "Third VR",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
        })

        const result = await getVeteranRookieData()

        expect(result.length).toBe(3)
        expect(result[0].title).toBe("First VR")
        expect(result[1].title).toBe("Third VR")
        expect(result[2].title).toBe("Second VR")
      })
    })

    describe("getDemographicsData", () => {
      it("should return demographics for all profiles when mode is 'all'", async () => {
        // Create profiles with different demographics
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-demo1@test.com`,
          gender: ["Cis Woman"],
          orientation: ["Straight"],
          race_color: ["White"],
          date_of_birth: "1990-01-01",
        })
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-demo2@test.com`,
          gender: ["Trans Man"],
          orientation: ["Gay"],
          race_color: ["Black"],
          date_of_birth: "1985-01-01",
        })
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-demo3@test.com`,
          gender: ["Cis Woman"],
          orientation: ["Bi"],
          race_color: ["Brown"],
          date_of_birth: "2000-01-01",
        })

        const result = await getDemographicsData("all")

        // Gender distribution
        expect(result.gender.length).toBeGreaterThan(0)
        const cisWomanGender = result.gender.find(
          (g) => g.category === "Cis Woman"
        )
        expect(cisWomanGender).toBeDefined()
        if (cisWomanGender) {
          expect(cisWomanGender.count).toBe(2)
        }

        // Orientation distribution
        expect(result.orientation.length).toBeGreaterThan(0)

        // Race distribution
        expect(result.race.length).toBeGreaterThan(0)

        // Age distribution
        expect(result.age.length).toBeGreaterThan(0)
      })

      it("should return demographics only for attended profiles when mode is 'attended'", async () => {
        const event = await createTestEvent(tracker, kysely, {
          title: "Demographics Test Event",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-12-01T19:00:00Z").toISOString(),
        })

        // Profile that attended
        const attendedProfile = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-attended-demo@test.com`,
          gender: ["Non-binary"],
          orientation: ["Pan"],
          race_color: ["Yellow"],
          date_of_birth: "1995-01-01",
        })

        // Profile that did NOT attend
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-notattended-demo@test.com`,
          gender: ["Cis Man"],
          orientation: ["Straight"],
          race_color: ["White"],
          date_of_birth: "1988-01-01",
        })

        await createTestEventParticipant(tracker, kysely, {
          event_id: event.id,
          profile_id: attendedProfile.id,
          attendance_status: "attended",
        })

        const result = await getDemographicsData("attended")

        // Should only have demographics from attended profile
        const nonBinaryGender = result.gender.find(
          (g) => g.category === "Non-binary"
        )
        expect(nonBinaryGender).toBeDefined()
        if (nonBinaryGender) {
          expect(nonBinaryGender.count).toBe(1)
        }

        // Should NOT have demographics from non-attended profile
        const cisMenGender = result.gender.find((g) => g.category === "Cis Man")
        expect(cisMenGender).toBeUndefined()
      })

      it("should handle profiles with multiple values in array fields", async () => {
        // Profile with multiple genders and orientations
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-multi@test.com`,
          gender: ["Non-binary", "Trans Man"],
          orientation: ["Bi", "Pan"],
          race_color: ["Black", "Indigenous"],
          date_of_birth: "1992-01-01",
        })

        const result = await getDemographicsData("all")

        // Each value should be counted separately
        const nonBinaryGender = result.gender.find(
          (g) => g.category === "Non-binary"
        )
        const transManGender = result.gender.find(
          (g) => g.category === "Trans Man"
        )

        expect(nonBinaryGender).toBeDefined()
        expect(transManGender).toBeDefined()
      })

      it("should handle profiles with empty or null array fields", async () => {
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-empty@test.com`,
          gender: null,
          orientation: [],
          race_color: null,
          date_of_birth: null,
        })

        // Should not throw, just return empty or reduced results
        const result = await getDemographicsData("all")
        expect(result).toBeDefined()
        expect(result.gender).toBeDefined()
        expect(result.orientation).toBeDefined()
        expect(result.race).toBeDefined()
        expect(result.age).toBeDefined()
      })

      it("should calculate age groups correctly", async () => {
        // Create profiles with different ages
        const today = new Date()
        const age20 = new Date(today.getFullYear() - 20, 0, 1)
        const age35 = new Date(today.getFullYear() - 35, 0, 1)
        const age55 = new Date(today.getFullYear() - 55, 0, 1)

        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-age20@test.com`,
          gender: ["Cis Woman"],
          date_of_birth: age20.toISOString().split("T")[0],
        })
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-age35@test.com`,
          gender: ["Cis Man"],
          date_of_birth: age35.toISOString().split("T")[0],
        })
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-age55@test.com`,
          gender: ["Cis Woman"],
          date_of_birth: age55.toISOString().split("T")[0],
        })

        const result = await getDemographicsData("all")

        // Should have age groups
        expect(result.age.length).toBeGreaterThan(0)
      })
    })
  })

  describe("Event Metrics", () => {
    describe("getEventAttendanceData", () => {
      it("should return attendance data for completed events only", async () => {
        const completedEvent = await createTestEvent(tracker, kysely, {
          title: "Completed Event",
          emoji: "🎉",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
          total_spots: 50,
        })

        const draftEvent = await createTestEvent(tracker, kysely, {
          title: "Draft Event",
          emoji: "📝",
          event_status: "Draft" as EventStatus,
          time_event_start: new Date("2025-08-15T19:00:00Z").toISOString(),
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
        await createTestEvent(tracker, kysely, {
          title: "First Event",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-01T19:00:00Z").toISOString(),
        })
        await createTestEvent(tracker, kysely, {
          title: "Second Event",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-08-01T19:00:00Z").toISOString(),
        })
        await createTestEvent(tracker, kysely, {
          title: "Third Event",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
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
          time_event_start: new Date("2025-09-01T19:00:00Z").toISOString(),
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
          attendance_status: "withdrew",
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
        if (eventResult) {
          expect(eventResult.inscritos).toBe(6)
          expect(eventResult.compareceram).toBe(3)
          expect(eventResult.nao_foram).toBe(1)
          expect(eventResult.skipped).toBe(1)
          expect(eventResult.withdrew).toBe(1)
          // rodizio is 2: 1 explicit + 1 from skipped (trigger auto-sets was_selected_for_rotation=true on skipped)
          expect(eventResult.rodizio).toBe(2)
          expect(eventResult.staff).toBe(1)
        }
      })

      it("should handle events with no participants", async () => {
        await createTestEvent(tracker, kysely, {
          title: "Empty Event",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-10-01T19:00:00Z").toISOString(),
        })

        const result = await getEventAttendanceData()
        const emptyEvent = result.find((e) => e.title === "Empty Event")

        expect(emptyEvent).toBeDefined()
        if (emptyEvent) {
          expect(emptyEvent.inscritos).toBe(0)
          expect(emptyEvent.compareceram).toBe(0)
          expect(emptyEvent.nao_foram).toBe(0)
        }
      })
    })

    describe("getEventRevenueData", () => {
      it("should return revenue data for completed events only", async () => {
        const completedEvent = await createTestEvent(tracker, kysely, {
          title: "Revenue Event",
          emoji: "💰",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
          ticket_price: 100,
        })

        const draftEvent = await createTestEvent(tracker, kysely, {
          title: "Draft Event",
          event_status: "Draft" as EventStatus,
          time_event_start: new Date("2025-08-15T19:00:00Z").toISOString(),
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
          time_event_start: new Date("2025-09-01T19:00:00Z").toISOString(),
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
        if (eventResult) {
          expect(eventResult.faturamento_total).toBe(270)
          expect(eventResult.num_pagantes).toBe(2)
        }
      })

      it("should handle events with no participants", async () => {
        await createTestEvent(tracker, kysely, {
          title: "Empty Revenue Event",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-10-01T19:00:00Z").toISOString(),
          ticket_price: 100,
        })

        const result = await getEventRevenueData()
        const emptyEvent = result.find((e) => e.title === "Empty Revenue Event")

        expect(emptyEvent).toBeDefined()
        if (emptyEvent) {
          expect(emptyEvent.faturamento_total).toBe(0)
          expect(emptyEvent.num_pagantes).toBe(0)
          expect(emptyEvent.ticket_price).toBe(100)
        }
      })

      it("should return events ordered by time_event_start ascending", async () => {
        await createTestEvent(tracker, kysely, {
          title: "First Revenue",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-01T19:00:00Z").toISOString(),
        })
        await createTestEvent(tracker, kysely, {
          title: "Second Revenue",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-08-01T19:00:00Z").toISOString(),
        })
        await createTestEvent(tracker, kysely, {
          title: "Third Revenue",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
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
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
        })

        const draftEvent = await createTestEvent(tracker, kysely, {
          title: "Draft Event",
          event_status: "Draft" as EventStatus,
          time_event_start: new Date("2025-08-15T19:00:00Z").toISOString(),
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
          time_event_start: new Date("2025-10-01T19:00:00Z").toISOString(),
        })

        const result = await getConversionFunnelData()
        const emptyEvent = result.find((e) => e.title === "Empty Funnel Event")

        expect(emptyEvent).toBeDefined()
        if (emptyEvent) {
          expect(emptyEvent.inscritos).toBe(0)
          expect(emptyEvent.finalizados).toBe(0)
          expect(emptyEvent.pagaram).toBe(0)
          expect(emptyEvent.compareceram).toBe(0)
          expect(emptyEvent.pct_finalizados).toBe(0)
          expect(emptyEvent.pct_pagaram).toBe(0)
          expect(emptyEvent.pct_compareceram).toBe(0)
        }
      })

      it("should return events ordered by time_event_start ascending", async () => {
        await createTestEvent(tracker, kysely, {
          title: "First Funnel",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-01T19:00:00Z").toISOString(),
        })
        await createTestEvent(tracker, kysely, {
          title: "Second Funnel",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-08-01T19:00:00Z").toISOString(),
        })
        await createTestEvent(tracker, kysely, {
          title: "Third Funnel",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
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
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
          total_spots: 50,
        })

        const draftEvent = await createTestEvent(tracker, kysely, {
          title: "Draft Event",
          event_status: "Draft" as EventStatus,
          time_event_start: new Date("2025-08-15T19:00:00Z").toISOString(),
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
          time_event_start: new Date("2025-09-01T19:00:00Z").toISOString(),
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
        if (eventResult) {
          expect(eventResult.compareceram).toBe(1)
          expect(eventResult.total_spots).toBe(0)
          expect(eventResult.occupancy_pct).toBe(0)
        }
      })

      it("should handle events with no participants", async () => {
        await createTestEvent(tracker, kysely, {
          title: "Empty Occupancy Event",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-10-01T19:00:00Z").toISOString(),
          total_spots: 100,
        })

        const result = await getOccupancyData()
        const emptyEvent = result.find((e) => e.title === "Empty Occupancy Event")

        expect(emptyEvent).toBeDefined()
        if (emptyEvent) {
          expect(emptyEvent.compareceram).toBe(0)
          expect(emptyEvent.total_spots).toBe(100)
          expect(emptyEvent.occupancy_pct).toBe(0)
        }
      })

      it("should return events ordered by time_event_start ascending", async () => {
        await createTestEvent(tracker, kysely, {
          title: "First Occupancy",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-01T19:00:00Z").toISOString(),
          total_spots: 50,
        })
        await createTestEvent(tracker, kysely, {
          title: "Second Occupancy",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-08-01T19:00:00Z").toISOString(),
          total_spots: 50,
        })
        await createTestEvent(tracker, kysely, {
          title: "Third Occupancy",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
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

  describe("Growth and Retention", () => {
    describe("getGrowthData", () => {
      it("should return monthly profile growth with cumulative counts", async () => {
        // Create profiles in different months (July-September 2025, after cutoff date)
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-jul1@test.com`,
          created_at: "2025-07-15T10:00:00Z",
        })
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-jul2@test.com`,
          created_at: "2025-07-20T10:00:00Z",
        })
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-aug1@test.com`,
          created_at: "2025-08-10T10:00:00Z",
        })
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-sep1@test.com`,
          created_at: "2025-09-05T10:00:00Z",
        })
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-sep2@test.com`,
          created_at: "2025-09-15T10:00:00Z",
        })

        const result = await getGrowthData()

        // Find our test months
        const jul = result.find((r) => r.month.startsWith("2025-07"))
        const aug = result.find((r) => r.month.startsWith("2025-08"))
        const sep = result.find((r) => r.month.startsWith("2025-09"))

        expect(jul).toBeDefined()
        expect(aug).toBeDefined()
        expect(sep).toBeDefined()

        if (jul && aug && sep) {
          expect(jul.new_profiles).toBe(2)
          expect(aug.new_profiles).toBe(1)
          expect(sep.new_profiles).toBe(2)

          // Cumulative should be increasing
          expect(sep.cumulative).toBeGreaterThan(jul.cumulative)
        }
      })

      it("should return results ordered by month ascending", async () => {
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-order1@test.com`,
          created_at: "2025-10-15T10:00:00Z",
        })
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-order2@test.com`,
          created_at: "2025-08-15T10:00:00Z",
        })

        const result = await getGrowthData()

        // August should come before October
        const augIdx = result.findIndex((r) => r.month.startsWith("2025-08"))
        const octIdx = result.findIndex((r) => r.month.startsWith("2025-10"))

        if (augIdx !== -1 && octIdx !== -1) {
          expect(augIdx).toBeLessThan(octIdx)
        }
      })
    })

    describe("getRetentionData", () => {
      it("should calculate how many people attended N events", async () => {
        // Create completed events
        const event1 = await createTestEvent(tracker, kysely, {
          title: "Event 1",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
        })
        const event2 = await createTestEvent(tracker, kysely, {
          title: "Event 2",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-08-15T19:00:00Z").toISOString(),
        })
        const event3 = await createTestEvent(tracker, kysely, {
          title: "Event 3",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-09-15T19:00:00Z").toISOString(),
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
        expect(twoEvents).toBeDefined()
        expect(threeEvents).toBeDefined()

        if (oneEvent && twoEvents && threeEvents) {
          expect(oneEvent.num_people).toBe(2)
          expect(twoEvents.num_people).toBe(1)
          expect(threeEvents.num_people).toBe(1)
        }
      })

      it("should only count attendance at completed events", async () => {
        const completedEvent = await createTestEvent(tracker, kysely, {
          title: "Completed",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
        })
        const draftEvent = await createTestEvent(tracker, kysely, {
          title: "Draft",
          event_status: "Draft" as EventStatus,
          time_event_start: new Date("2025-08-15T19:00:00Z").toISOString(),
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
        if (oneEvent) {
          expect(oneEvent.num_people).toBe(1)
        }

        const twoEvents = result.find((r) => r.events_attended === 2)
        expect(twoEvents).toBeUndefined()
      })
    })

    describe("getSeasonalityData", () => {
      it("should calculate average metrics by month", async () => {
        // Create events in same month (July 2025)
        const jul2025Event1 = await createTestEvent(tracker, kysely, {
          title: "Jul 2025 Event 1",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
          total_spots: 50,
        })
        const jul2025Event2 = await createTestEvent(tracker, kysely, {
          title: "Jul 2025 Event 2",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-07-20T19:00:00Z").toISOString(),
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

        // Jul Event 1: 1 inscrito, 1 compareceu
        await createTestEventParticipant(tracker, kysely, {
          event_id: jul2025Event1.id,
          profile_id: profile1.id,
          attendance_status: "attended",
        })

        // Jul Event 2: 2 inscritos, 1 compareceu
        await createTestEventParticipant(tracker, kysely, {
          event_id: jul2025Event2.id,
          profile_id: profile1.id,
          attendance_status: "attended",
        })
        await createTestEventParticipant(tracker, kysely, {
          event_id: jul2025Event2.id,
          profile_id: profile2.id,
          attendance_status: "not-attended",
        })

        const result = await getSeasonalityData()

        const july = result.find((r) => r.month_name === "July")
        expect(july).toBeDefined()
        if (july) {
          // Average inscritos: (1 + 2) / 2 = 1.5 -> rounded to 2
          expect(july.avg_inscritos).toBeGreaterThanOrEqual(1)
          // Average compareceram: (1 + 1) / 2 = 1
          expect(july.avg_compareceram).toBeGreaterThanOrEqual(1)
        }
      })

      it("should return all 12 months when data exists", async () => {
        // Create at least one event per month (July 2025 - June 2026)
        for (let i = 0; i < 12; i++) {
          const month = ((i + 6) % 12) + 1 // Start from July (7)
          const year = month >= 7 ? 2025 : 2026
          await createTestEvent(tracker, kysely, {
            title: `Month ${month} Year ${year}`,
            event_status: "Completed" as EventStatus,
            time_event_start: new Date(
              `${year}-${String(month).padStart(2, "0")}-15T19:00:00Z`
            ).toISOString(),
            total_spots: 50,
          })
        }

        const result = await getSeasonalityData()

        expect(result.length).toBe(12)
      })
    })
  })

  describe("KPI Scores", () => {
    describe("getKpiScores", () => {
      it("should return all KPI metrics with correct values", async () => {
        // Create profiles (2 veterans, 1 non-veteran)
        const veteran1 = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-vet1@test.com`,
          became_veteran_date: new Date("2025-07-01T00:00:00Z").toISOString(),
        })
        const veteran2 = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `${testPrefix}-vet2@test.com`,
          became_veteran_date: new Date("2025-07-01T00:00:00Z").toISOString(),
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
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
          total_spots: 50,
          ticket_price: 100,
        })
        const event2 = await createTestEvent(tracker, kysely, {
          title: "KPI Event 2",
          event_status: "Completed" as EventStatus,
          time_event_start: new Date("2025-08-15T19:00:00Z").toISOString(),
          total_spots: 40,
          ticket_price: 150,
        })
        // Draft event should not be counted
        await createTestEvent(tracker, kysely, {
          title: "Draft Event",
          event_status: "Draft" as EventStatus,
          time_event_start: new Date("2025-09-15T19:00:00Z").toISOString(),
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
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
          total_spots: 50,
          ticket_price: 100,
        })
        const draftEvent = await createTestEvent(tracker, kysely, {
          title: "Draft",
          event_status: "Draft" as EventStatus,
          time_event_start: new Date("2025-08-15T19:00:00Z").toISOString(),
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
          time_event_start: new Date("2025-07-15T19:00:00Z").toISOString(),
          total_spots: 0,
          ticket_price: 100,
        })

        const result = await getKpiScores()

        // Should not throw, occupancy should be 0 or excluded from average
        expect(result.avg_occupancy_pct).toBe(0)
      })
    })
  })
})
