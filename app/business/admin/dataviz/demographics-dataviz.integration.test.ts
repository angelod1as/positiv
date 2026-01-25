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
import type { EventStatus } from "~types/database/entities.types"

describe("Demographics DataViz - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const testPrefix = `demographics-dataviz-${Date.now()}`

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

  describe("getVeteranRookieData", () => {
    it("should calculate veterans and rookies for completed events only", async () => {
      const eventDate = new Date("2024-06-01T19:00:00Z")
      const completedEvent = await createTestEvent(tracker, kysely, {
        title: "Veteran Rookie Event",
        emoji: "🎖️",
        event_status: "Completed" as EventStatus,
        time_event_start: eventDate.toISOString(),
      })

      const draftEvent = await createTestEvent(tracker, kysely, {
        title: "Draft Event",
        event_status: "Draft" as EventStatus,
        time_event_start: new Date("2024-07-01T19:00:00Z").toISOString(),
      })

      // Veteran: became veteran BEFORE the event date
      const veteranProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-veteran@test.com`,
        became_veteran_date: new Date("2024-01-01T00:00:00Z").toISOString(),
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
        became_veteran_date: new Date("2024-12-01T00:00:00Z").toISOString(),
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
      const eventDate = new Date("2024-06-01T19:00:00Z")
      const event = await createTestEvent(tracker, kysely, {
        title: "Attendance Filter Event",
        event_status: "Completed" as EventStatus,
        time_event_start: eventDate.toISOString(),
      })

      const veteranProfile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `${testPrefix}-vet-attended@test.com`,
        became_veteran_date: new Date("2024-01-01T00:00:00Z").toISOString(),
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
      expect(eventResult!.veterans).toBe(1)
      expect(eventResult!.rookies).toBe(0)
    })

    it("should handle events with no participants", async () => {
      await createTestEvent(tracker, kysely, {
        title: "Empty Veteran Rookie Event",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-04-01T19:00:00Z").toISOString(),
      })

      const result = await getVeteranRookieData()
      const emptyEvent = result.find(
        (e) => e.title === "Empty Veteran Rookie Event"
      )

      expect(emptyEvent).toBeDefined()
      expect(emptyEvent!.veterans).toBe(0)
      expect(emptyEvent!.rookies).toBe(0)
    })

    it("should return events ordered by time_event_start ascending", async () => {
      await createTestEvent(tracker, kysely, {
        title: "First VR",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-01T19:00:00Z").toISOString(),
      })
      await createTestEvent(tracker, kysely, {
        title: "Second VR",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-02-01T19:00:00Z").toISOString(),
      })
      await createTestEvent(tracker, kysely, {
        title: "Third VR",
        event_status: "Completed" as EventStatus,
        time_event_start: new Date("2024-01-15T19:00:00Z").toISOString(),
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
      expect(cisWomanGender!.count).toBe(2)

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
        time_event_start: new Date("2024-06-01T19:00:00Z").toISOString(),
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
      expect(nonBinaryGender!.count).toBe(1)

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
