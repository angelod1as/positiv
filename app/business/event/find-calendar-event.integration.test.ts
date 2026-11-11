import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createTestEvent } from "~/test/db-test-utils"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { findCalendarEvent } from "./event.server"

describe("findCalendarEvent - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const eventIn = (event_status: "Registration Closed" | "Draft") =>
    createTestEvent(tracker, kysely, {
      title: `Calendar ${event_status}`,
      event_status,
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })

  // The session client hid every status but Registration Open and Scheduled,
  // so a person already in a closed event could not add it to a calendar.
  it("finds an event whose registration has closed", async () => {
    const event = await eventIn("Registration Closed")

    const found = await findCalendarEvent(event.id)

    expect(found?.id).toBe(event.id)
  })

  it("does not hand out an unpublished event", async () => {
    const event = await eventIn("Draft")

    expect(await findCalendarEvent(event.id)).toBeUndefined()
  })
})
