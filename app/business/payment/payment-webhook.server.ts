import { fromZonedTime } from "date-fns-tz"
import { sql, type Kysely } from "kysely"
import type { z } from "zod"
import { kyselyDb } from "~/kysely-db"
import type { Database } from "~types/database/kysely.types"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import { reaisToCents } from "./asaas-client.server"
import {
  sendPaymentConfirmedEmail,
  sendPaymentRefundEmail,
} from "./payment-emails.server"

/**
 * Deliberately permissive. Asaas adds fields without warning, and the docs say
 * so: a body that carries something new must still be processed, not rejected.
 * Only `id` and `event` are required, because they are what dedupes and routes.
 */
export const webhookEventSchema = zod.looseObject({
  id: zod.string().min(1),
  event: zod.string().min(1),
  dateCreated: zod.string().optional(),
  payment: zod
    .looseObject({
      id: zod.string(),
      status: zod.string().optional(),
      value: zod.number().optional(),
      netValue: zod.number().nullable().optional(),
      installment: zod.string().nullable().optional(),
      externalReference: zod.string().nullable().optional(),
      paymentDate: zod.string().nullable().optional(),
      confirmedDate: zod.string().nullable().optional(),
      dueDate: zod.string().nullable().optional(),
      refunds: zod
        .array(
          zod.looseObject({
            value: zod.number().optional(),
            status: zod.string().optional(),
          }),
        )
        .nullable()
        .optional(),
    })
    .optional(),
})

export type AsaasWebhookEvent = z.infer<typeof webhookEventSchema>

/**
 * Writes the delivery to the inbox and says whether there is work to do.
 *
 * A row exists from the first delivery onwards, so its mere presence does not
 * mean the event was handled: an attempt that threw leaves the row behind with
 * `error` set and `processed_at` still null, and Asaas retries exactly because
 * nothing was applied. Only a processed row makes a redelivery a no-op.
 */
export async function recordWebhookEvent(
  event: AsaasWebhookEvent,
): Promise<{ isNew: boolean; alreadyProcessed: boolean; id: string }> {
  const inserted = await kyselyDb
    .insertInto("payment_webhook_events")
    .values({
      asaas_event_id: event.id,
      event_type: event.event,
      asaas_payment_id: event.payment?.id ?? null,
      payload: JSON.stringify(event),
    })
    .onConflict((oc) => oc.column("asaas_event_id").doNothing())
    .returning("id")
    .executeTakeFirst()

  if (inserted) return { isNew: true, alreadyProcessed: false, id: inserted.id }

  const existing = await kyselyDb
    .selectFrom("payment_webhook_events")
    .select(["id", "processed_at"])
    .where("asaas_event_id", "=", event.id)
    .executeTakeFirstOrThrow()

  return {
    isNew: false,
    alreadyProcessed: existing.processed_at !== null,
    id: existing.id,
  }
}

const PAID_EVENTS = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]
const ALARM_EVENTS = [
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_REFUND_DENIED",
]

/** Statuses a charge can still be paid from — including expired: Asaas lets
 *  someone pay a Pix after the due date, and the money is real. */
const PAYABLE = ["pending", "awaiting_payment", "expired"] as const

// Asaas dates a charge by the calendar day in Brazil and it stays payable
// through the end of that day, which is what `due_at` has to mean here: the
// expiry cron and PAYMENT_OVERDUE both read this column.
const CHARGE_TIME_ZONE = "America/Sao_Paulo"
const ASAAS_DATE = /^\d{4}-\d{2}-\d{2}$/

function dueAtFromAsaas(dueDate: string | null | undefined): string | null {
  if (!dueDate || !ASAAS_DATE.test(dueDate)) return null
  return fromZonedTime(
    `${dueDate}T23:59:59`,
    CHARGE_TIME_ZONE,
  ).toISOString()
}

// `payments.id` is a uuid column, and Postgres throws on a value it cannot
// cast rather than answering no rows. A charge opened by another system on the
// same Asaas account carries that system's reference, and an event about it
// has to leave as the 200 it deserves, not as a 500 Asaas keeps retrying.
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findPayment(db: Kysely<Database>, event: AsaasWebhookEvent) {
  const payment = event.payment
  if (!payment) return null

  const byId = await db
    .selectFrom("payments")
    .selectAll()
    .where("asaas_payment_id", "=", payment.id)
    .executeTakeFirst()
  if (byId) return byId

  if (payment.installment) {
    // One payments row per Asaas installment plan: a resend or a re-pick opens
    // a new plan rather than joining this one. The column carries a plain
    // index, not a unique one like asaas_payment_id, so this is an invariant
    // the code keeps and the schema does not -- two rows sharing a plan would
    // make the row picked here arbitrary.
    const byInstallment = await db
      .selectFrom("payments")
      .selectAll()
      .where("asaas_installment_id", "=", payment.installment)
      .executeTakeFirst()
    if (byInstallment) return byInstallment
  }

  if (payment.externalReference && UUID.test(payment.externalReference)) {
    const byReference = await db
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", payment.externalReference)
      .executeTakeFirst()
    if (byReference) return byReference
  }

  return null
}

function refundedCents(
  event: AsaasWebhookEvent,
  fallback: number | null,
): number | null {
  const refunds = event.payment?.refunds
  if (!refunds?.length) return fallback
  const done = refunds.filter((refund) => refund.status !== "CANCELLED")
  // A list that came back with nothing but cancellations is not the same as no
  // list at all: the fallback means "a full refund Asaas did not itemise", and
  // reusing it here would report money as returned that never moved.
  if (!done.length) return null
  return done.reduce((sum, refund) => sum + reaisToCents(refund.value ?? 0), 0)
}

/**
 * What a card plan has given back so far, in cents.
 *
 * The same shape as the net below, for the same reason: a plan refunded one
 * charge at a time arrives as one event per charge, each listing only that
 * charge's refunds. The latest event per Asaas payment id carries that charge's
 * whole list, so taking it once per charge and adding them up is what keeps a
 * redelivery -- or a second refund of the same charge -- from counting twice.
 */
async function installmentRefundedCents(
  db: Kysely<Database>,
  installmentId: string,
): Promise<number> {
  const result = await sql<{ event_type: string; payload: AsaasWebhookEvent }>`
    SELECT DISTINCT ON (payload->'payment'->>'id') event_type, payload
      FROM payment_webhook_events
     WHERE payload->'payment'->>'installment' = ${installmentId}
       AND event_type IN ('PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED')
     ORDER BY payload->'payment'->>'id', received_at DESC`.execute(db)

  return result.rows.reduce((total, row) => {
    const value = row.payload.payment?.value
    // A charge-level PAYMENT_REFUNDED without a list gave that charge back
    // whole, which is its own value -- not the plan's.
    const fallback =
      row.event_type === "PAYMENT_REFUNDED" && value != null
        ? reaisToCents(value)
        : null
    return total + (refundedCents(row.payload, fallback) ?? 0)
  }, 0)
}

/**
 * What a card plan has actually netted so far, in cents.
 *
 * Asaas bills an installment plan as one payment per installment and sends an
 * event for each, so the plan's net is a sum rather than a single number. It is
 * recomputed from the inbox rather than added up as events arrive: the same
 * installment is described by both CONFIRMED and RECEIVED, and counting the
 * latest net once per Asaas payment id is what keeps either of them, in any
 * order, from being counted twice.
 */
async function installmentNetCents(
  db: Kysely<Database>,
  installmentId: string,
): Promise<number> {
  const result = await sql<{ net: string }>`
    SELECT COALESCE(SUM(net), 0)::text AS net FROM (
      SELECT DISTINCT ON (payload->'payment'->>'id')
             (payload->'payment'->>'netValue')::numeric AS net
        FROM payment_webhook_events
       WHERE payload->'payment'->>'installment' = ${installmentId}
         AND event_type IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED')
         AND payload->'payment'->>'netValue' IS NOT NULL
       ORDER BY payload->'payment'->>'id', received_at DESC
    ) AS per_installment`.execute(db)

  return Math.round(Number(result.rows[0]?.net ?? 0) * 100)
}

type TransitionResult = {
  applied: boolean
  reason?: string
  /** Set when the guarded update moved the row and the receipt is owed. */
  confirmPaymentId?: string
  /** Set when money went back and the participant has not been told yet. */
  refundPaymentId?: string
}

export async function applyWebhookEvent(
  inboxId: string,
  event: AsaasWebhookEvent,
): Promise<{ applied: boolean; reason?: string }> {
  let result: TransitionResult

  try {
    // The transition and the delivery that caused it commit together. Half of
    // that pair is worse than neither: a row marked paid whose delivery was
    // never closed comes back as a redelivery, lands in `already_paid`, and
    // the participant is never told.
    result = await kyselyDb.transaction().execute(async (trx) => {
      const payment = await findPayment(trx, event)

      if (!payment) {
        // A charge created straight in the Asaas dashboard, or one from another
        // system on the same account. Retrying will not make it ours.
        logger.warn("Asaas webhook about an unknown charge", {
          asaasEventId: event.id,
          event: event.event,
          asaasPaymentId: event.payment?.id,
        })
        await markProcessed(trx, inboxId, null)
        return { applied: false, reason: "unknown_payment" }
      }

      const transition = await applyToPayment(trx, payment, event)
      await markProcessed(trx, inboxId, null)
      return transition
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    try {
      // On its own connection: the transaction above is already rolled back.
      await markProcessed(kyselyDb, inboxId, message)
    } catch {
      // The inbox is unreachable too. The throw below is what matters — it is
      // what makes Asaas retry the whole thing.
    }
    throw error
  }

  if (result.confirmPaymentId) {
    // Outside the transaction on purpose: an SMTP round trip has no business
    // holding a database connection, and by this point the money has moved.
    // A failure here costs the receipt, not the transition — asking Asaas to
    // retry would not re-send it anyway, since the guarded update no longer
    // matches, and it would stall every event queued behind this one.
    try {
      await sendPaymentConfirmedEmail({ paymentId: result.confirmPaymentId })
    } catch (error) {
      logger.error("Payment confirmed, but the receipt could not be sent", {
        paymentId: result.confirmPaymentId,
        asaasEventId: event.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (result.refundPaymentId) {
    // Outside the transaction for the same reasons as the receipt above, and
    // swallowed for the same one: the money is already back.
    try {
      await sendPaymentRefundEmail({ paymentId: result.refundPaymentId })
    } catch (error) {
      logger.error("Money went back, but the notice could not be sent", {
        paymentId: result.refundPaymentId,
        asaasEventId: event.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { applied: result.applied, reason: result.reason }
}

async function markProcessed(
  db: Kysely<Database>,
  inboxId: string,
  error: string | null,
) {
  await db
    .updateTable("payment_webhook_events")
    // `processed_at` stays null on a failure, which is what the partial index
    // on unprocessed rows is for, and what lets the redelivery try again.
    .set(error ? { error } : { processed_at: new Date().toISOString(), error })
    .where("id", "=", inboxId)
    .execute()
}

async function applyToPayment(
  db: Kysely<Database>,
  payment: {
    id: string
    amount: number | null
    status: string
    asaas_installment_id: string | null
    refund_amount: number | null
    refund_requested_amount: number | null
  },
  event: AsaasWebhookEvent,
): Promise<TransitionResult> {
  const now = new Date().toISOString()

  if (ALARM_EVENTS.includes(event.event)) {
    // The one branch here that writes nothing, and deliberately: a chargeback,
    // a denied refund or a capture refused by risk analysis needs a person,
    // not a status. A denied refund in particular leaves the row paid with
    // refund_requested_at set and a participant who was told the money was
    // coming back -- no transition makes that right.
    logger.error("Asaas raised an alarm on a payment", {
      paymentId: payment.id,
      event: event.event,
      asaasPaymentId: event.payment?.id,
    })
    return { applied: false, reason: "alarm_logged" }
  }

  if (PAID_EVENTS.includes(event.event)) {
    const amount =
      payment.amount ??
      (event.payment?.value ? reaisToCents(event.payment.value) : null)
    const installmentId = payment.asaas_installment_id
    const net = installmentId
      ? await installmentNetCents(db, installmentId)
      : event.payment?.netValue != null
        ? reaisToCents(event.payment.netValue)
        : null

    const updated = await db
      .updateTable("payments")
      .set({ status: "paid", paid_at: now, amount, asaas_net: net })
      .where("id", "=", payment.id)
      .where("status", "in", PAYABLE)
      .returning("id")
      .executeTakeFirst()

    // No row means it was already paid — a redelivery, the second event of the
    // CONFIRMED/RECEIVED pair, or a later installment of a plan the first one
    // already settled. The email has been sent once already; the money the
    // later installments bring in is still ours to record.
    if (!updated) {
      if (installmentId) {
        await db
          .updateTable("payments")
          .set({ asaas_net: net })
          .where("id", "=", payment.id)
          // Guarded like every other write here. A plan keeps billing after a
          // refund or a cancellation, and a settled row whose net still moves
          // contradicts the refunded_at beside it.
          .where("status", "=", "paid")
          .execute()
      }
      return { applied: false, reason: "already_paid" }
    }

    return { applied: true, confirmPaymentId: payment.id }
  }

  if (event.event === "PAYMENT_OVERDUE") {
    const updated = await db
      .updateTable("payments")
      .set({ status: "expired" })
      .where("id", "=", payment.id)
      .where("status", "in", ["pending", "awaiting_payment"])
      .returning("id")
      .executeTakeFirst()
    return { applied: Boolean(updated) }
  }

  if (event.event === "PAYMENT_DELETED") {
    const updated = await db
      .updateTable("payments")
      .set({ status: "cancelled" })
      .where("id", "=", payment.id)
      .where("status", "in", ["pending", "awaiting_payment", "expired"])
      .returning("id")
      .executeTakeFirst()
    return { applied: Boolean(updated) }
  }

  if (event.event === "PAYMENT_RESTORED") {
    const updated = await db
      .updateTable("payments")
      .set({ status: "awaiting_payment" })
      .where("id", "=", payment.id)
      .where("status", "in", ["cancelled", "expired"])
      .returning("id")
      .executeTakeFirst()
    return { applied: Boolean(updated) }
  }

  if (
    event.event === "PAYMENT_REFUNDED" ||
    event.event === "PAYMENT_PARTIALLY_REFUNDED"
  ) {
    // The fallback is what a full refund Asaas did not itemise means. A
    // partial one without a list says nothing about how much moved, and
    // reading it as the whole amount would close the row as fully refunded.
    const installmentId = payment.asaas_installment_id
    const refunded = installmentId
      ? await installmentRefundedCents(db, installmentId)
      : refundedCents(
          event,
          event.event === "PAYMENT_REFUNDED" ? payment.amount : null,
        )
    if (!refunded || !payment.amount) {
      return { applied: false, reason: "no_refund_amount" }
    }

    const isFull = refunded >= payment.amount
    const updated = await db
      .updateTable("payments")
      .set({
        status: isFull ? "refunded" : "partially_refunded",
        refund_amount: Math.min(refunded, payment.amount),
        refunded_at: now,
      })
      .where("id", "=", payment.id)
      .where("status", "in", ["paid", "partially_refunded"])
      .returning("id")
      .executeTakeFirst()

    // A single charge is one refund per event, and each one is worth telling.
    // A plan is one refund spread over an event per charge, so it is told once:
    // on the event that brings the total up to what was asked for -- or to the
    // whole gross, for a refund started in the Asaas dashboard with no request
    // behind it.
    const target = payment.refund_requested_amount ?? payment.amount
    const completes =
      !installmentId ||
      ((payment.refund_amount ?? 0) < target && refunded >= target)

    return {
      applied: Boolean(updated),
      reason: updated ? undefined : "not_refundable",
      refundPaymentId: updated && completes ? payment.id : undefined,
    }
  }

  if (event.event === "PAYMENT_REFUND_IN_PROGRESS") {
    const updated = await db
      .updateTable("payments")
      .set({ refund_requested_at: now })
      .where("id", "=", payment.id)
      .where("refund_requested_at", "is", null)
      .returning("id")
      .executeTakeFirst()
    return { applied: Boolean(updated) }
  }

  if (event.event === "PAYMENT_UPDATED") {
    const value = event.payment?.value
    const amount = value == null ? null : reaisToCents(value)
    const dueAt = dueAtFromAsaas(event.payment?.dueDate)

    // `payments.amount` is CHECK (amount > 0), so a zero or negative figure is
    // refused here rather than thrown back by the database as a 500 Asaas
    // would retry forever.
    const changes = {
      ...(amount != null && amount > 0 ? { amount } : {}),
      ...(dueAt ? { due_at: dueAt } : {}),
    }
    if (!Object.keys(changes).length) {
      return { applied: false, reason: "nothing_to_sync" }
    }

    const updated = await db
      .updateTable("payments")
      .set(changes)
      .where("id", "=", payment.id)
      // Expired belongs here: Asaas can move the due date of a charge that
      // lapsed, and a charge it still considers payable is one this row has
      // to keep following.
      .where("status", "in", ["pending", "awaiting_payment", "expired"])
      .returning("id")
      .executeTakeFirst()

    return { applied: Boolean(updated) }
  }

  // PAYMENT_CREATED, PAYMENT_CHECKOUT_VIEWED and everything else: recorded,
  // nothing to do.
  return { applied: false, reason: "ignored" }
}
