import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createTestEvent } from "~/test/db-test-utils"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { findVisibleEvent } from "./find-visible-event.server"

describe("findVisibleEvent - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("resolves a Registration Closed event", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Closed Event",
      event_status: "Registration Closed",
    })

    const found = await findVisibleEvent(event.id)

    expect(found?.id).toBe(event.id)
  })

  it("resolves a Registration Open event", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Open Event",
      event_status: "Registration Open",
    })

    const found = await findVisibleEvent(event.id)

    expect(found?.id).toBe(event.id)
  })

  it("hides a Draft event", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Draft Event",
      event_status: "Draft",
    })

    const found = await findVisibleEvent(event.id)

    expect(found).toBeUndefined()
  })

  it("returns nothing for an id that does not exist", async () => {
    const found = await findVisibleEvent("00000000-0000-0000-0000-000000000000")

    expect(found).toBeUndefined()
  })
})
