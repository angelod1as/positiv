import { sql, type Kysely } from "kysely"
import { kyselyDb } from "~/kysely-db"
import type { Database } from "~types/database/kysely.types"
import { logger } from "~/lib/logger/logger.server"
import type { PaymentEvent, ProviderRefund } from "./payment-provider"
import {
  deliverPaymentEmail,
  queuePaymentEmail,
} from "./payment-email-outbox.server"
import { applyRefundTally, type RefundablePayment } from "./refund-apply.server"
import { tallyRefunds } from "./refund-state"

/**
 * Writes the delivery to the inbox and says whether there is work to do. The
 * provider's raw payload is kept for auditing, the translated event for what
 * the domain reads back.
 *
 * A row exists from the first delivery onwards, so its mere presence does not
 * mean the event was handled: an attempt that threw leaves the row behind with
 * `error` set and `processed_at` still null, and the provider retries exactly
 * because nothing was applied. Only a processed row makes a redelivery a no-op.
 */
export async function recordWebhookEvent(
  event: PaymentEvent,
  payload: unknown,
): Promise<{ isNew: boolean; alreadyProcessed: boolean; id: string }> {
  const inserted = await kyselyDb
    .insertInto("payment_webhook_events")
    .values({
      provider_event_id: event.eventId,
      event_type: event.providerType,
      provider_charge_id: event.chargeId,
      provider_plan_id: event.planId,
      payload: JSON.stringify(payload),
      event: JSON.stringify(event),
    })
    .onConflict((oc) => oc.column("provider_event_id").doNothing())
    .returning("id")
    .executeTakeFirst()

  if (inserted) return { isNew: true, alreadyProcessed: false, id: inserted.id }

  const existing = await kyselyDb
    .selectFrom("payment_webhook_events")
    .select(["id", "processed_at"])
    .where("provider_event_id", "=", event.eventId)
    .executeTakeFirstOrThrow()

  return {
    isNew: false,
    alreadyProcessed: existing.processed_at !== null,
    id: existing.id,
  }
}

/** Statuses a charge can still be paid from — including expired: a provider
 *  may let someone pay a Pix after the due date, and the money is real. */
const PAYABLE = ["pending", "awaiting_payment", "expired"] as const

// `payments.id` is a uuid column, and Postgres throws on a value it cannot
// cast rather than answering no rows. A charge opened by another system on the
// same provider account carries that system's reference, and an event about it
// has to leave as the 200 it deserves, not as a 500 the provider keeps
// retrying.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Locked for the rest of the event's transaction. The provider delivers one
// event at a time, but a plan's refund is decided from a total several events
// share, and two of them applied at once would each read the row before the
// other wrote it -- and each send the email.
async function findPayment(db: Kysely<Database>, event: PaymentEvent) {
  if (event.chargeId) {
    const byId = await db
      .selectFrom("payments")
      .selectAll()
      .where("provider_charge_id", "=", event.chargeId)
      .forUpdate()
      .executeTakeFirst()
    if (byId) return byId
  }

  if (event.planId) {
    // One payments row per installment plan: a resend or a re-pick opens a new
    // plan rather than joining this one. The column carries a plain index, not
    // a unique one like provider_charge_id, so this is an invariant the code
    // keeps and the schema does not -- two rows sharing a plan would make the
    // row picked here arbitrary.
    const byPlan = await db
      .selectFrom("payments")
      .selectAll()
      .where("provider_plan_id", "=", event.planId)
      .forUpdate()
      .executeTakeFirst()
    if (byPlan) return byPlan
  }

  if (event.reference && UUID.test(event.reference)) {
    const byReference = await db
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", event.reference)
      .forUpdate()
      .executeTakeFirst()
    if (byReference) return byReference
  }

  return null
}

/**
 * Every refund of a card plan the inbox knows about.
 *
 * A plan's refund arrives as one event per charge, each listing only that
 * charge's refunds. The latest event per charge carries that charge's whole
 * list, so taking it once per charge is what keeps a redelivery -- or a second
 * refund of the same charge -- from counting twice.
 */
async function planRefunds(
  db: Kysely<Database>,
  planId: string,
): Promise<ProviderRefund[]> {
  const result = await sql<{ refunds: ProviderRefund[] | null }>`
    SELECT DISTINCT ON (provider_charge_id) event->'refunds' AS refunds
      FROM payment_webhook_events
     WHERE provider_plan_id = ${planId}
       AND event->>'type' IN ('refunded', 'partially_refunded')
     ORDER BY provider_charge_id, received_at DESC`.execute(db)

  return result.rows.flatMap((row) => row.refunds ?? [])
}

type TransitionResult = {
  applied: boolean
  reason?: string
  /** The outbox row the guarded update queued for the receipt. */
  confirmEmailId?: string
  /** The outbox row queued for the notice that money went back. */
  refundEmailId?: string
}

export async function applyWebhookEvent(
  inboxId: string,
  event: PaymentEvent,
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
        // A charge created straight in the provider's dashboard, or one from
        // another system on the same account. Retrying will not make it ours.
        logger.warn("Payment webhook about an unknown charge", {
          providerEventId: event.eventId,
          event: event.providerType,
          chargeId: event.chargeId,
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
      // what makes the provider retry the whole thing.
    }
    throw error
  }

  // Outside the transaction on purpose: an SMTP round trip has no business
  // holding a database connection, and by this point the money has moved. A
  // failure here costs nothing but time — the row the transaction queued is
  // still owed, and the sweep sends it late rather than never.
  const owed = [
    [
      result.confirmEmailId,
      "Payment confirmed, but the receipt could not be sent",
    ],
    [result.refundEmailId, "Money went back, but the notice could not be sent"],
  ] as const

  for (const [emailId, failure] of owed) {
    if (!emailId) continue
    try {
      await deliverPaymentEmail(emailId)
    } catch (error) {
      logger.error(failure, {
        paymentEmailId: emailId,
        providerEventId: event.eventId,
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
  payment: RefundablePayment,
  event: PaymentEvent,
): Promise<TransitionResult> {
  const now = new Date().toISOString()

  switch (event.type) {
    case "alarm":
    case "refund_denied": {
      // A chargeback, a denied refund or a capture refused by risk analysis
      // needs a person, not a status, so none of them moves the row.
      logger.error("The payment provider raised an alarm on a payment", {
        paymentId: payment.id,
        event: event.providerType,
        chargeId: event.chargeId,
      })

      if (event.type === "alarm") {
        return { applied: false, reason: "alarm_logged" }
      }

      // A provider takes a refund request and can refuse it afterwards -- when
      // it cannot make the transfer, or while it waits for someone to
      // authorise the refund in its dashboard. A refund is one request, on a
      // charge or on a whole plan, so a denial means nothing moved: the claim
      // goes back and the admin can ask again, told why. Guarded on paid, so a
      // denial arriving after a refund that did go through is ignored.
      const released = await db
        .updateTable("payments")
        .set({
          refund_requested_at: null,
          refund_requested_amount: null,
          refund_denied_at: now,
          refund_denial_reason: event.reason,
        })
        .where("id", "=", payment.id)
        .where("status", "=", "paid")
        .returning("id")
        .executeTakeFirst()
      return { applied: Boolean(released), reason: "alarm_logged" }
    }

    case "paid": {
      const amount = payment.amount ?? (event.amount || null)
      const updated = await db
        .updateTable("payments")
        .set({ status: "paid", paid_at: now, amount })
        .where("id", "=", payment.id)
        .where("status", "in", PAYABLE)
        .returning("id")
        .executeTakeFirst()

      // No row means it was already paid — a redelivery, a second event about
      // the same payment, or a later installment of a plan the first one
      // already settled. The email has been sent once already.
      if (!updated) return { applied: false, reason: "already_paid" }

      // Queued inside the transaction, so the receipt is owed the moment the
      // row says paid. A send that never happens is then a row the sweep
      // finds.
      const confirmEmailId = await queuePaymentEmail(db, {
        paymentId: payment.id,
        kind: "confirmation",
      })

      return { applied: true, confirmEmailId }
    }

    case "overdue": {
      const updated = await db
        .updateTable("payments")
        .set({ status: "expired" })
        .where("id", "=", payment.id)
        .where("status", "in", ["pending", "awaiting_payment"])
        .returning("id")
        .executeTakeFirst()
      return { applied: Boolean(updated) }
    }

    case "cancelled": {
      const updated = await db
        .updateTable("payments")
        .set({ status: "cancelled" })
        .where("id", "=", payment.id)
        .where("status", "in", ["pending", "awaiting_payment", "expired"])
        .returning("id")
        .executeTakeFirst()
      return { applied: Boolean(updated) }
    }

    case "restored": {
      const updated = await db
        .updateTable("payments")
        .set({ status: "awaiting_payment" })
        .where("id", "=", payment.id)
        .where("status", "in", ["cancelled", "expired"])
        .returning("id")
        .executeTakeFirst()
      return { applied: Boolean(updated) }
    }

    case "refunded":
    case "partially_refunded": {
      // A single charge given back whole without saying how much is the whole
      // row. A partial one that says nothing stays unknown: reading it as the
      // whole amount would close the row as fully refunded.
      const refunds = payment.provider_plan_id
        ? await planRefunds(db, payment.provider_plan_id)
        : (event.refunds ??
          (event.type === "refunded" && payment.amount !== null
            ? [{ amount: payment.amount, state: "done" as const }]
            : null))
      if (!refunds?.length) {
        return { applied: false, reason: "no_refund_amount" }
      }

      const { applied, refundEmailId } = await applyRefundTally(
        db,
        payment,
        tallyRefunds(refunds),
      )

      return {
        applied,
        reason: applied ? undefined : "not_refundable",
        refundEmailId,
      }
    }

    case "refund_in_progress": {
      const updated = await db
        .updateTable("payments")
        .set({ refund_requested_at: now })
        .where("id", "=", payment.id)
        .where("refund_requested_at", "is", null)
        .returning("id")
        .executeTakeFirst()
      return { applied: Boolean(updated) }
    }

    case "updated": {
      // `payments.amount` is CHECK (amount > 0), so a zero or negative figure
      // is refused here rather than thrown back by the database as a 500 the
      // provider would retry forever.
      const changes = {
        ...(event.amount != null && event.amount > 0
          ? { amount: event.amount }
          : {}),
        ...(event.dueAt ? { due_at: event.dueAt } : {}),
      }
      if (!Object.keys(changes).length) {
        return { applied: false, reason: "nothing_to_sync" }
      }

      const updated = await db
        .updateTable("payments")
        .set(changes)
        .where("id", "=", payment.id)
        // Expired belongs here: a provider can move the due date of a charge
        // that lapsed, and a charge it still considers payable is one this row
        // has to keep following.
        .where("status", "in", ["pending", "awaiting_payment", "expired"])
        .returning("id")
        .executeTakeFirst()

      return { applied: Boolean(updated) }
    }

    case "ignored":
      // A charge created, a checkout viewed and everything else: recorded,
      // nothing to do.
      return { applied: false, reason: "ignored" }
  }
}
