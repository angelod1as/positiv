import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { logger } from "~/lib/logger/logger.server"
import { createTestEvent } from "~/test/db-test-utils"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { createOrUpdateEvent } from "./event.server"

// The save goes through Kysely alone. A session client that throws on use
// proves it, and keeps the service_role -- which would mask any missing check
// -- out of these tests.
const noSupabase = new Proxy(
  {},
  {
    get() {
      throw new Error("createOrUpdateEvent must not reach supabase-js")
    },
  },
)

describe("createOrUpdateEvent - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const contextAs = (permissions: string[]) => ({
    supabase: noSupabase as never,
    supabaseHeaders: new Headers(),
    currentUser: { id: "00000000-0000-4000-8000-000000000001" },
    currentProfile: {
      id: "00000000-0000-4000-8000-000000000002",
      basic_data_filled: true,
      created_at: "2026-11-11T00:00:00Z",
      permissions,
    },
    host: null,
  })

  const context = () => contextAs(["admin.panel", "events.manage"])

  const formValues = (title: string) => {
    const start = new Date("2026-09-01T20:00:00.000Z").toISOString()
    const end = new Date("2026-09-02T04:00:00.000Z").toISOString()

    return {
      title,
      description: "Descrição do evento",
      emoji: "🎉",
      location: "Motel Harmony",
      // Form values: the admin types reais, the schema converts to cents.
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
      ticket_price: 20000,
      total_spots: 60,
    })

    const result = await createOrUpdateEvent(formValues("Legacy edition renamed"), {
      ...context(),
      eventId: event.id,
    })

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

  it("refuses whoever may not manage events, and writes nothing", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Untouched",
      emoji: "🔒",
      description: "Não mexa",
      location: "Motel Harmony",
      event_status: "Draft",
    })

    const result = await createOrUpdateEvent(formValues("Hijacked"), {
      ...contextAs(["admin.panel"]),
      eventId: event.id,
    })

    expect(result.success).toBe(false)
    const saved = await kysely
      .selectFrom("events")
      .select("title")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()
    expect(saved.title).toBe("Untouched")
  })

  it("refuses an id that names no event, and creates nothing under it", async () => {
    const unknownId = "6b1f0c2e-4d7a-4e8b-9c3d-2a5f7e9b1c04"

    const result = await createOrUpdateEvent(formValues("Phantom"), {
      ...context(),
      eventId: unknownId,
    })

    expect(result.success).toBe(false)
    const rows = await kysely
      .selectFrom("events")
      .select("id")
      .where("id", "=", unknownId)
      .execute()
    expect(rows).toHaveLength(0)
  })

  it("logs why the event could not be saved", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => logger)

    try {
      const result = await createOrUpdateEvent(formValues("Broken id"), {
        ...context(),
        eventId: "not-a-uuid",
      })

      expect(result.success).toBe(false)
      expect(error).toHaveBeenCalledWith("Could not save the event", {
        eventId: "not-a-uuid",
        error: expect.objectContaining({ code: "22P02" }),
      })
    } finally {
      error.mockRestore()
    }
  })
})
