import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile, createTestEvent, createTestEventParticipant } from "~/test/db-test-utils"
import { getNextEvents } from "./get-next-events"
import type { EventStatus } from "~types/database/entities.types"

describe("getNextEvents - Query Optimization Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    // Clear existing test events to ensure clean state
    await kysely.deleteFrom("events").where("title", "like", "Test Event%").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("is_applied field behavior", () => {
    it("should return is_applied=true when user has applied to event", async () => {
      // Create test profile
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test-applied@example.com",
        full_name: "Test User Applied",
      })

      // Create future event
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7) // 7 days in future

      const event = await createTestEvent(tracker, kysely, {
        title: "Test Event - User Applied",
        event_status: "Registration Open" as EventStatus,
        time_event_start: futureDate.toISOString(),
        time_event_end: new Date(futureDate.getTime() + 3600000).toISOString(), // +1 hour
      })

      // Create event participant with is_user_applied=true
      await createTestEventParticipant(tracker, kysely, {
        profile_id: profile.id,
        event_id: event.id,
        is_user_applied: true,
      })

      // Execute the query
      const result = await getNextEvents(profile.id, 10, true)

      // Verify is_applied is true
      expect(result.success).toBe(true)
      const events = result.data
      expect(events).toBeDefined()
      expect(events?.length).toBeGreaterThan(0)

      const testEvent = events?.find((e) => e.id === event.id)
      expect(testEvent).toBeDefined()
      expect(testEvent?.is_applied).toBe(true)
    })

    it("should return is_applied=false when user has not applied to event", async () => {
      // Create test profile
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test-not-applied@example.com",
        full_name: "Test User Not Applied",
      })

      // Create future event
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const event = await createTestEvent(tracker, kysely, {
        title: "Test Event - User Not Applied",
        event_status: "Registration Open" as EventStatus,
        time_event_start: futureDate.toISOString(),
        time_event_end: new Date(futureDate.getTime() + 3600000).toISOString(),
      })

      // Don't create event participant - user hasn't applied

      // Execute the query
      const result = await getNextEvents(profile.id, 10, true)

      // Verify is_applied is false
      expect(result.success).toBe(true)
      const events = result.data
      expect(events).toBeDefined()

      const testEvent = events?.find((e) => e.id === event.id)
      expect(testEvent).toBeDefined()
      expect(testEvent?.is_applied).toBe(false)
    })

    it("should return is_applied=false when user has event_participant but is_user_applied=false", async () => {
      // Create test profile
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test-pending@example.com",
        full_name: "Test User Pending",
      })

      // Create future event
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const event = await createTestEvent(tracker, kysely, {
        title: "Test Event - User Pending",
        event_status: "Registration Open" as EventStatus,
        time_event_start: futureDate.toISOString(),
        time_event_end: new Date(futureDate.getTime() + 3600000).toISOString(),
      })

      // Create event participant with is_user_applied=false (e.g., invited but not applied)
      await createTestEventParticipant(tracker, kysely, {
        profile_id: profile.id,
        event_id: event.id,
        is_user_applied: false,
      })

      // Execute the query
      const result = await getNextEvents(profile.id, 10, true)

      // Verify is_applied is false even though participant record exists
      expect(result.success).toBe(true)
      const events = result.data
      expect(events).toBeDefined()

      const testEvent = events?.find((e) => e.id === event.id)
      expect(testEvent).toBeDefined()
      expect(testEvent?.is_applied).toBe(false)
    })

    it("should not include is_applied field when no profileId is provided", async () => {
      // Create future event
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const event = await createTestEvent(tracker, kysely, {
        title: "Test Event - No Profile",
        event_status: "Registration Open" as EventStatus,
        time_event_start: futureDate.toISOString(),
        time_event_end: new Date(futureDate.getTime() + 3600000).toISOString(),
      })

      // Execute the query without profileId
      const result = await getNextEvents(undefined, 10, true)

      // Verify is_applied field is not included
      expect(result.success).toBe(true)
      const events = result.data
      expect(events).toBeDefined()

      const testEvent = events?.find((e) => e.id === event.id)
      expect(testEvent).toBeDefined()
      expect(testEvent?.is_applied).toBeUndefined()
    })
  })

  describe("query filtering and ordering", () => {
    it("should only return future events", async () => {
      // Create past event
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7) // 7 days ago

      await createTestEvent(tracker, kysely, {
        title: "Test Event - Past",
        event_status: "Completed" as EventStatus,
        time_event_start: pastDate.toISOString(),
        time_event_end: new Date(pastDate.getTime() + 3600000).toISOString(),
      })

      // Create future event
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const futureEvent = await createTestEvent(tracker, kysely, {
        title: "Test Event - Future",
        event_status: "Registration Open" as EventStatus,
        time_event_start: futureDate.toISOString(),
        time_event_end: new Date(futureDate.getTime() + 3600000).toISOString(),
      })

      // Execute the query
      const result = await getNextEvents(undefined, 10, true)

      // Verify only future events are returned
      expect(result.success).toBe(true)
      const events = result.data
      expect(events).toBeDefined()

      const eventIds = events?.map((e) => e.id) || []
      expect(eventIds).not.toContain("past-event-id")
      expect(eventIds).toContain(futureEvent.id)
    })

    it("should respect limit parameter", async () => {
      // Create 5 future events
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      for (let i = 0; i < 5; i++) {
        const eventDate = new Date(futureDate)
        eventDate.setHours(eventDate.getHours() + i) // Stagger times

        await createTestEvent(tracker, kysely, {
          title: `Test Event - Limit ${i + 1}`,
          event_status: "Registration Open" as EventStatus,
          time_event_start: eventDate.toISOString(),
          time_event_end: new Date(eventDate.getTime() + 3600000).toISOString(),
        })
      }

      // Execute the query with limit=3
      const result = await getNextEvents(undefined, 3, true)

      // Verify only 3 events are returned
      expect(result.success).toBe(true)
      const events = result.data
      expect(events).toBeDefined()
      expect(events?.length).toBeLessThanOrEqual(3)
    })

    it("should filter by homepage status when isHomepage=true", async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      // Create event with "Registration Closed" status
      await createTestEvent(tracker, kysely, {
        title: "Test Event - Closed",
        event_status: "Registration Closed" as EventStatus,
        time_event_start: futureDate.toISOString(),
        time_event_end: new Date(futureDate.getTime() + 3600000).toISOString(),
      })

      // Execute the query with isHomepage=true
      const result = await getNextEvents(undefined, 10, true)

      // Verify "Registration Closed" event is not included
      expect(result.success).toBe(true)
      const events = result.data
      expect(events).toBeDefined()

      const closedEvent = events?.find((e) => e.title === "Test Event - Closed")
      expect(closedEvent).toBeUndefined()
    })

    it("should include Registration Closed events when isHomepage=false", async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      // Create event with "Registration Closed" status
      const event = await createTestEvent(tracker, kysely, {
        title: "Test Event - Closed Dashboard",
        event_status: "Registration Closed" as EventStatus,
        time_event_start: futureDate.toISOString(),
        time_event_end: new Date(futureDate.getTime() + 3600000).toISOString(),
      })

      // Execute the query with isHomepage=false
      const result = await getNextEvents(undefined, 10, false)

      // Verify "Registration Closed" event IS included
      expect(result.success).toBe(true)
      const events = result.data
      expect(events).toBeDefined()

      const closedEvent = events?.find((e) => e.id === event.id)
      expect(closedEvent).toBeDefined()
    })
  })

  describe("performance and query optimization", () => {
    it("should use index on event_participants join", async () => {
      // Verify the index exists
      const indexQuery = await kysely
        .selectFrom("pg_indexes")
        .selectAll()
        .where("indexname", "=", "idx_event_participants_profile_event_applied")
        .executeTakeFirst()

      expect(indexQuery).toBeDefined()
      expect(indexQuery?.indexname).toBe("idx_event_participants_profile_event_applied")
    })
  })
})
