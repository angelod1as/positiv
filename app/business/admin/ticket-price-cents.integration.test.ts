import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { sql } from "kysely"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"

describe("events.ticket_price in cents - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("stores the column as an integer", async () => {
    const { rows } = await sql<{ data_type: string }>`
      SELECT data_type
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'events'
         AND column_name = 'ticket_price'
    `.execute(kysely)

    expect(rows[0]?.data_type).toBe("integer")
  })

  it("reads a price back as the whole number of cents it was given", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Cents Test Event",
      ticket_price: 22000,
    })

    const stored = await kysely
      .selectFrom("events")
      .select("ticket_price")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()

    expect(stored.ticket_price).toBe(22000)
  })

  it("rounds a fractional price to the nearest cent rather than storing it", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Fractional Cents Test Event",
    })

    await sql`
      UPDATE public.events SET ticket_price = 220.6 WHERE id = ${event.id}
    `.execute(kysely)

    const stored = await kysely
      .selectFrom("events")
      .select("ticket_price")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()

    expect(stored.ticket_price).toBe(221)
  })

  it("seeds every event with a price already in the cents range", async () => {
    // Matched by the titles `03_events.sql` writes rather than read off the
    // whole table: the seeds are what this asserts, and any other suite's rows
    // would otherwise decide whether it passes.
    const { rows } = await sql<{
      min: number | null
      max: number | null
      seeded: number
    }>`
      SELECT min(ticket_price) AS min,
             max(ticket_price) AS max,
             count(*)::int      AS seeded
        FROM public.events
       WHERE ticket_price IS NOT NULL
         AND title ~ '^(Evento (Concluído|Cancelado|Com Inscrições|Agendado)|Festa da Colheita)'
    `.execute(kysely)

    expect(rows[0].seeded).toBeGreaterThan(0)
    expect(Number(rows[0].min)).toBeGreaterThanOrEqual(1000)
    expect(Number(rows[0].max)).toBeLessThanOrEqual(15000)
  })
})
