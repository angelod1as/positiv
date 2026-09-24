import { sql, type Kysely } from "kysely"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"
import type { Database } from "~types/database/kysely.types"
import { ACTIVE_PAYMENT_STATUSES } from "./payment-totals.server"
import {
  sendPaymentConfirmedEmail,
  sendPaymentLinkEmail,
  sendPaymentRefundEmail,
} from "./payment-emails.server"

export type PaymentEmailKind = "link" | "confirmation" | "refund"

const SENDERS: Record<
  PaymentEmailKind,
  (input: { paymentId: string }) => Promise<{ success: boolean }>
> = {
  link: sendPaymentLinkEmail,
  confirmation: sendPaymentConfirmedEmail,
  refund: sendPaymentRefundEmail,
}

/** How long a row waits for its own send before the sweep takes it over. */
const OVERDUE_MINUTES = 10

/**
 * How long a claim holds. Long enough that the sweep never races the send that
 * is already in flight, short enough that a sender killed mid-flight gives the
 * row back on the next run.
 */
const LEASE_MINUTES = 10

/** Rows one sweep will carry, so a backlog cannot stall the request. */
const SWEEP_LIMIT = 50

/**
 * The wait after a first failure, doubled with each one after it, so a send
 * that will eventually go through is not retried on every sweep on its way.
 */
const BACKOFF_BASE_MINUTES = 15

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString()

const minutesFromNow = (minutes: number) => minutesAgo(-minutes)

/**
 * Records that a payment owes an email.
 *
 * Takes the connection rather than reaching for one, so the caller can write
 * this inside the transaction that owes the email: the intent to send then
 * commits with the state change, and nothing is lost between the two.
 */
export async function queuePaymentEmail(
  db: Kysely<Database>,
  { paymentId, kind }: { paymentId: string; kind: PaymentEmailKind },
): Promise<string> {
  const row = await db
    .insertInto("payment_emails")
    .values({ payment_id: paymentId, kind })
    .returning("id")
    .executeTakeFirstOrThrow()

  return row.id
}

/**
 * Sends one queued email, if this caller is the one that gets to.
 *
 * The claim is a guarded UPDATE, so of two senders reaching the same row only
 * one comes back with it — the other finds the lease taken and leaves. A send
 * that fails leaves `sent_at` null on purpose: the row is still owed, and the
 * sweep will come back for it once the lease expires.
 *
 * `claimed` is how a caller tells the two apart: a row somebody else is
 * sending is not a row whose send failed.
 */
export async function deliverPaymentEmail(
  id: string,
): Promise<{ sent: boolean; claimed: boolean }> {
  const claimed = await kyselyDb
    .updateTable("payment_emails")
    .set({
      claimed_at: new Date().toISOString(),
      attempts: sql<number>`attempts + 1`,
    })
    .where("id", "=", id)
    .where("sent_at", "is", null)
    .where((eb) =>
      eb.or([
        eb("claimed_at", "is", null),
        eb("claimed_at", "<", minutesAgo(LEASE_MINUTES)),
      ]),
    )
    // Whether a link is still worth sending is asked here rather than only in
    // the sweep's candidate query: a webhook landing between that select and
    // this claim would otherwise send a link to a charge just paid or called
    // off. Asking as part of the claim leaves no window at all.
    .where((eb) =>
      eb.or([
        eb("kind", "!=", "link"),
        eb.exists(
          eb
            .selectFrom("payments")
            .select("payments.id")
            .whereRef("payments.id", "=", "payment_emails.payment_id")
            .where("payments.status", "in", [...ACTIVE_PAYMENT_STATUSES]),
        ),
      ]),
    )
    .returning(["payment_id", "kind", "claimed_at", "attempts"])
    .executeTakeFirst()

  if (!claimed) return { sent: false, claimed: false }

  const paymentId = claimed.payment_id
  const kind = claimed.kind as PaymentEmailKind
  // Every write below is guarded on the claim this call took. A send that
  // hangs past the lease comes back to a row the sweep has re-claimed, and
  // what it writes then would release or stamp somebody else's claim -- which
  // is the double send the lease exists to prevent.
  const heldClaim = claimed.claimed_at

  let error: string | null = null
  try {
    const result = await SENDERS[kind]({ paymentId })
    if (!result.success) error = "the sender reported a failure"
  } catch (thrown) {
    error = thrown instanceof Error ? thrown.message : String(thrown)
  }

  if (error) {
    logger.error("A payment email could not be sent", {
      paymentEmailId: id,
      paymentId,
      kind,
      error,
    })
    // The claim is given back with the error: it covers a send in flight, and
    // this one is over. How long the sweep waits before trying again is
    // next_attempt_at's to say, not the lease's.
    await kyselyDb
      .updateTable("payment_emails")
      .set({
        last_error: error,
        claimed_at: null,
        next_attempt_at: minutesFromNow(
          BACKOFF_BASE_MINUTES * 2 ** (claimed.attempts - 1),
        ),
      })
      .where("id", "=", id)
      .where("claimed_at", "=", heldClaim)
      .execute()
    return { sent: false, claimed: true }
  }

  const stamped = await kyselyDb
    .updateTable("payment_emails")
    .set({ sent_at: new Date().toISOString(), last_error: null })
    .where("id", "=", id)
    .where("claimed_at", "=", heldClaim)
    .returning("id")
    .executeTakeFirst()

  if (!stamped) {
    // The email went out on a claim that had already been taken over, so the
    // row still reads as owed and whoever holds it now may send a second one.
    // Nothing here can undo that; what it can do is say so.
    logger.error("A payment email was sent on a claim that had expired", {
      paymentEmailId: id,
      paymentId,
      kind,
    })
  }

  return { sent: true, claimed: true }
}

/**
 * Sends what nobody managed to send. Called by the retry-payment-emails cron.
 *
 * A link is the one kind that stops being owed: an admin who saw the send fail
 * can cancel the charge and open another, and a link to a dead charge helps
 * nobody. Those rows are left unsent rather than stamped — they are the record
 * of an email that was owed and never went out.
 *
 * ACTIVE_PAYMENT_STATUSES here and PAYABLE in the webhook are meant to differ.
 * PAYABLE counts a lapsed charge, because Asaas takes a late Pix and the money
 * is real. This one decides whether a link is still worth sending, and a link
 * swept out after the due date names a deadline already past — the admin's
 * route at that point is a fresh offer, which queues a fresh link.
 */
export async function sweepPaymentEmails(): Promise<{
  processed: number
  sent: number
  failed: number
  skipped: number
}> {
  const candidates = await kyselyDb
    .selectFrom("payment_emails as pe")
    .innerJoin("payments as p", "p.id", "pe.payment_id")
    .select("pe.id")
    .where("pe.sent_at", "is", null)
    .where("pe.created_at", "<", minutesAgo(OVERDUE_MINUTES))
    .where((eb) =>
      eb.or([
        eb("pe.next_attempt_at", "is", null),
        eb("pe.next_attempt_at", "<=", new Date().toISOString()),
      ]),
    )
    .where((eb) =>
      eb.or([
        eb("pe.claimed_at", "is", null),
        eb("pe.claimed_at", "<", minutesAgo(LEASE_MINUTES)),
      ]),
    )
    .where((eb) =>
      eb.or([
        eb("pe.kind", "!=", "link"),
        eb("p.status", "in", [...ACTIVE_PAYMENT_STATUSES]),
      ]),
    )
    .orderBy("pe.created_at")
    .limit(SWEEP_LIMIT)
    .execute()

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const candidate of candidates) {
    // A row claimed between the select above and the claim below is somebody
    // else's to send -- an admin hitting resend as the cron fires. Counting it
    // as failed would report a failure where nothing failed.
    const result = await deliverPaymentEmail(candidate.id)
    if (result.sent) sent += 1
    else if (result.claimed) failed += 1
    else skipped += 1
  }

  return { processed: candidates.length, sent, failed, skipped }
}
