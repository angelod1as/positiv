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
import { getVeteranRookieData } from "./demographics-dataviz.server"
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
})
