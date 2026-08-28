import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { sql } from "kysely"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations")

/**
 * The backfill migration is read from disk and re-executed against the rows
 * this suite creates. It has already run against the test database by the time
 * the suite starts, so there is no other way to watch it act on known input —
 * and reading the file rather than copying its statement is what keeps the
 * assertions describing the migration that ships instead of one that used to.
 */
async function readBackfillStatement() {
  const files = await readdir(MIGRATIONS_DIR)
  const migration = files.find((file) => file.endsWith("_backfill_payments.sql"))
  if (!migration) {
    throw new Error("No _backfill_payments.sql migration found")
  }
  return sql.raw(await readFile(join(MIGRATIONS_DIR, migration), "utf8"))
}

describe("backfilling the payments ledger", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const participants: Record<string, string> = {}

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()

    const event = await createTestEvent(tracker, kysely, {
      title: "Backfill Event",
      ticket_price: 20000,
    })
    const freeEvent = await createTestEvent(tracker, kysely, {
      title: "Backfill Event Without A Price",
      ticket_price: null,
    })

    const cases = {
      paidWithAmount: { event_id: event.id, has_paid: true, payment: 220 },
      paidWithoutAmount: { event_id: event.id, has_paid: true, payment: 0 },
      amountWithoutFlag: { event_id: event.id, has_paid: false, payment: 150 },
      nothing: { event_id: event.id, has_paid: false, payment: 0 },
      paidWithoutPrice: {
        event_id: freeEvent.id,
        has_paid: true,
        payment: 0,
      },
    }

    for (const [name, columns] of Object.entries(cases)) {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `test${testId}-${name}@example.com`,
        full_name: name,
      })
      const participant = await createTestEventParticipant(tracker, kysely, {
        profile_id: profile.id,
        ...columns,
      })
      participants[name] = participant.id
    }
  })

  afterEach(async () => {
    // The rows the backfill itself inserts are nobody's fixture, so the tracker
    // never sees them; event_participants is ON DELETE RESTRICT and cleanup
    // would fail without this.
    await kysely
      .deleteFrom("payments")
      .where("event_participant_id", "in", Object.values(participants))
      .execute()
    await cleanupAfterTest(tracker, kysely)
  })

  async function backfill() {
    const statement = await readBackfillStatement()
    await statement.execute(kysely)
  }

  async function paymentFor(participantId: string) {
    return kysely
      .selectFrom("payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirst()
  }

  it("credits a paid participant with the amount that was recorded, in cents", async () => {
    await backfill()

    const payment = await paymentFor(participants.paidWithAmount)
    expect(payment).toMatchObject({
      kind: "manual",
      status: "paid",
      method: "pix",
      amount: 22000,
      base_amount: 20000,
      note: "backfill",
    })
    expect(payment?.paid_at).not.toBeNull()
    expect(payment?.due_at).toEqual(payment?.paid_at)
  })

  it("credits a paid participant with no amount with the event's ticket price", async () => {
    await backfill()

    const payment = await paymentFor(participants.paidWithoutAmount)
    expect(payment?.amount).toBe(20000)
    expect(payment?.status).toBe("paid")
  })

  it("credits a paid participant with one cent when nobody recorded a price", async () => {
    await backfill()

    const payment = await paymentFor(participants.paidWithoutPrice)
    // amount > 0 and base_amount > 0 are table constraints, so a row with no
    // price on either side still has to carry something. One cent says the
    // money moved without claiming an amount nobody wrote down.
    expect(payment?.amount).toBe(1)
    expect(payment?.base_amount).toBe(1)
    expect(payment?.status).toBe("paid")
  })

  it("records money that arrived even when the paid box was never ticked", async () => {
    await backfill()

    const payment = await paymentFor(participants.amountWithoutFlag)
    expect(payment?.amount).toBe(15000)
    expect(payment?.status).toBe("paid")
  })

  it("leaves a participant who paid nothing without a row", async () => {
    await backfill()

    expect(await paymentFor(participants.nothing)).toBeUndefined()
  })

  it("is idempotent", async () => {
    await backfill()
    await backfill()

    const rows = await kysely
      .selectFrom("payments")
      .select("id")
      .where("event_participant_id", "=", participants.paidWithAmount)
      .execute()

    expect(rows).toHaveLength(1)
  })

  it("makes the view agree with the old columns", async () => {
    await backfill()

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participants.paidWithAmount)
      .executeTakeFirstOrThrow()

    expect(totals.paid_gross).toBe(22000)
    expect(totals.net).toBe(22000)
    expect(totals.fee).toBe(0)
    expect(totals.has_paid).toBe(true)
  })

  it("skips a participant who already has a payment", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participants.paidWithAmount,
      kind: "asaas",
      status: "paid",
      method: "credit_card",
      base_amount: 20000,
      amount: 21000,
    })

    await backfill()

    const rows = await kysely
      .selectFrom("payments")
      .select(["amount", "note"])
      .where("event_participant_id", "=", participants.paidWithAmount)
      .execute()

    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(21000)
  })
})
