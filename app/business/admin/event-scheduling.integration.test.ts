import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"
import { updateEventStatusesAutomatically } from "./event-scheduling.server"

describe("Event Scheduling - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    // Clear any existing test events
    await kysely.deleteFrom("events").where("title", "like", "Test%").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("updateEventStatusesAutomatically", () => {
    it("should transition events from Scheduled to Registration Open when application time is reached", async () => {
      // Create an event that should be opened (application start time in the past)
      const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      
      const scheduledEvent = await createTestEvent(tracker, kysely, {
        title: "Test Scheduled Event",
        event_status: "Scheduled",
        time_application_start: pastTime,
        time_application_end: futureTime,
        time_event_start: futureTime,
        auto_publish: true
      })

      // Run the automatic update function
      const result = await updateEventStatusesAutomatically(kysely)

      // Check that the event status was updated
      const updatedEvent = await kysely
        .selectFrom("events")
        .selectAll()
        .where("id", "=", scheduledEvent.id)
        .executeTakeFirstOrThrow()

      expect(updatedEvent.event_status).toBe("Registration Open")
      expect(result.updated).toContain(scheduledEvent.id)
      expect(result.count).toBe(1)
    })

    it("should not transition events when auto_publish is false", async () => {
      // Create an event with auto_publish disabled
      const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const scheduledEvent = await createTestEvent(tracker, kysely, {
        title: "Test Manual Event",
        event_status: "Scheduled",
        time_application_start: pastTime,
        time_application_end: futureTime,
        time_event_start: futureTime,
        auto_publish: false
      })

      // Run the automatic update function
      const result = await updateEventStatusesAutomatically(kysely)

      // Check that the event status was NOT updated
      const unchangedEvent = await kysely
        .selectFrom("events")
        .selectAll()
        .where("id", "=", scheduledEvent.id)
        .executeTakeFirstOrThrow()

      expect(unchangedEvent.event_status).toBe("Scheduled")
      expect(result.updated).not.toContain(scheduledEvent.id)
      expect(result.count).toBe(0)
    })

    it("should not transition events when application time is in the future", async () => {
      // Create an event with future application start time
      const futureApplicationTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      const futureEventTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const scheduledEvent = await createTestEvent(tracker, kysely, {
        title: "Test Future Event",
        event_status: "Scheduled",
        time_application_start: futureApplicationTime,
        time_application_end: futureEventTime,
        time_event_start: futureEventTime,
        auto_publish: true
      })

      // Run the automatic update function
      const result = await updateEventStatusesAutomatically(kysely)

      // Check that the event status was NOT updated
      const unchangedEvent = await kysely
        .selectFrom("events")
        .selectAll()
        .where("id", "=", scheduledEvent.id)
        .executeTakeFirstOrThrow()

      expect(unchangedEvent.event_status).toBe("Scheduled")
      expect(result.updated).not.toContain(scheduledEvent.id)
      expect(result.count).toBe(0)
    })

    it("should handle multiple events correctly", async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      // Create multiple events with different conditions
      const event1 = await createTestEvent(tracker, kysely, {
        title: "Test Event 1 - Should Update",
        event_status: "Scheduled",
        time_application_start: pastTime,
        time_event_start: futureTime,
        auto_publish: true
      })

      const event2 = await createTestEvent(tracker, kysely, {
        title: "Test Event 2 - Should Update",
        event_status: "Scheduled",
        time_application_start: pastTime,
        time_event_start: futureTime,
        auto_publish: true
      })

      const event3 = await createTestEvent(tracker, kysely, {
        title: "Test Event 3 - Manual",
        event_status: "Scheduled",
        time_application_start: pastTime,
        time_event_start: futureTime,
        auto_publish: false
      })

      // Run the automatic update function
      const result = await updateEventStatusesAutomatically(kysely)

      // Check results
      expect(result.count).toBe(2)
      expect(result.updated).toContain(event1.id)
      expect(result.updated).toContain(event2.id)
      expect(result.updated).not.toContain(event3.id)

      // Verify individual event statuses
      const events = await kysely
        .selectFrom("events")
        .selectAll()
        .where("id", "in", [event1.id, event2.id, event3.id])
        .execute()

      const updatedEvent1 = events.find(e => e.id === event1.id)
      const updatedEvent2 = events.find(e => e.id === event2.id)
      const updatedEvent3 = events.find(e => e.id === event3.id)

      expect(updatedEvent1?.event_status).toBe("Registration Open")
      expect(updatedEvent2?.event_status).toBe("Registration Open")
      expect(updatedEvent3?.event_status).toBe("Scheduled")
    })

    it("should not update events that are already open", async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const openEvent = await createTestEvent(tracker, kysely, {
        title: "Test Already Open Event",
        event_status: "Registration Open",
        time_application_start: pastTime,
        time_event_start: futureTime,
        auto_publish: true
      })

      // Run the automatic update function
      const result = await updateEventStatusesAutomatically(kysely)

      // Should not be in the updated list
      expect(result.updated).not.toContain(openEvent.id)
      expect(result.count).toBe(0)
    })

    it("should create campaign tracking rows for newly opened events", async () => {
      // Clear any existing campaign tracking rows
      await kysely.deleteFrom("event_newsletter_campaigns").execute()

      const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const scheduledEvent = await createTestEvent(tracker, kysely, {
        title: "Test Event for Campaign Tracking",
        event_status: "Scheduled",
        time_application_start: pastTime,
        time_application_end: futureTime,
        time_event_start: futureTime,
        auto_publish: true
      })

      // Run the automatic update function
      const result = await updateEventStatusesAutomatically(kysely)

      // Verify event was opened
      expect(result.updated).toContain(scheduledEvent.id)
      expect(result.count).toBe(1)

      // Verify campaign tracking row was created
      const trackingRow = await kysely
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", scheduledEvent.id)
        .executeTakeFirst()

      expect(trackingRow).toBeDefined()
      expect(trackingRow?.campaign_is_created).toBe(false)
      expect(trackingRow?.campaign_is_sent).toBe(false)
      expect(trackingRow?.times_attempted).toBe(0)
    })

    it("should not create duplicate tracking rows for already opened events", async () => {
      // Clear any existing campaign tracking rows
      await kysely.deleteFrom("event_newsletter_campaigns").execute()

      const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const scheduledEvent = await createTestEvent(tracker, kysely, {
        title: "Test Event for Duplicate Check",
        event_status: "Scheduled",
        time_application_start: pastTime,
        time_application_end: futureTime,
        time_event_start: futureTime,
        auto_publish: true
      })

      // Run the automatic update function twice
      await updateEventStatusesAutomatically(kysely)
      await updateEventStatusesAutomatically(kysely)

      // Verify only one tracking row exists
      const trackingRows = await kysely
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", scheduledEvent.id)
        .execute()

      expect(trackingRows).toHaveLength(1)
    })
  })
})