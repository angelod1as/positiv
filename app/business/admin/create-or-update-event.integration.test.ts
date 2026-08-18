import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createTestEvent, getTestSupabaseClient } from "~/test/db-test-utils"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { createOrUpdateEvent } from "./admin.server"

describe("createOrUpdateEvent - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const context = () => ({
    supabase: getTestSupabaseClient(),
    supabaseHeaders: new Headers(),
    currentUser: { id: "00000000-0000-4000-8000-000000000001" },
    currentProfile: null,
    host: null,
  })

  const formValues = (title: string) => {
    const start = new Date("2026-09-01T20:00:00.000Z").toISOString()
    const end = new Date("2026-09-02T04:00:00.000Z").toISOString()

    return {
      title,
      description: "Descrição do evento",
      emoji: "🎉",
      location: "Motel Harmony",
      ticket_price: 200,
      total_spots: 60,
      auto_publish: true,
      time_event_start: start,
      time_event_end: end,
      time_application_start: start,
      time_group_start: start,
      time_group_end: end,
      time_payment_start: start,
      time_payment_end: end,
    }
  }

  it("keeps the event type of a legacy BDSM event when it is edited", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Legacy BDSM edition",
      emoji: "🔒",
      description: "Uma edição antiga",
      location: "Motel Harmony",
      event_status: "Completed",
      event_type: "bdsm",
      ticket_price: 200,
      total_spots: 60,
    })

    const result = await createOrUpdateEvent(
      formValues("Legacy edition renamed"),
      { ...context(), eventId: event.id },
    )

    expect(result.success).toBe(true)

    const saved = await kysely
      .selectFrom("events")
      .select(["title", "event_type"])
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()

    expect(saved.title).toBe("Legacy edition renamed")
    expect(saved.event_type).toBe("bdsm")
  })

  it("creates new events as regular", async () => {
    const result = await createOrUpdateEvent(formValues("Evento novo"), {
      ...context(),
      eventId: undefined,
    })

    if (!result.success) throw new Error("expected the event to be created")

    tracker.track("events", result.data)

    const saved = await kysely
      .selectFrom("events")
      .select("event_type")
      .where("id", "=", result.data)
      .executeTakeFirstOrThrow()

    expect(saved.event_type).toBe("regular")
  })
})
