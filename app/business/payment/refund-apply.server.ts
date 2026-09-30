import type { Kysely } from "kysely"
import type { Database } from "~types/database/kysely.types"
import { queuePaymentEmail } from "./payment-email-outbox.server"
import { nextRefundState, type RefundTally } from "./refund-state"

export type RefundablePayment = {
  id: string
  amount: number | null
  status: string
  provider_plan_id: string | null
  refund_amount: number | null
  refunded_at: string | null
  refund_requested_at: string | null
  refund_requested_amount: number | null
}

/**
 * Writes what Asaas's refunds add up to onto the payment -- from a webhook or
 * from reading Asaas directly, the same way either time. Guarded on the two
 * statuses a refund can move, so a row that is not ours to change is left
 * alone. The refund notice, when one is owed, is queued in the same
 * transaction as the write that owes it.
 */
export async function applyRefundTally(
  db: Kysely<Database>,
  payment: RefundablePayment,
  tally: RefundTally,
): Promise<{ applied: boolean; refundEmailId?: string }> {
  if (!payment.amount) return { applied: false }

  const previousRefunded = payment.refund_amount ?? 0
  const state = nextRefundState({
    amount: payment.amount,
    previousRefunded,
    requested: payment.refund_requested_amount,
    claimed: payment.refund_requested_at !== null,
    isPlan: payment.provider_plan_id !== null,
    tally,
  })

  const now = new Date().toISOString()
  const updated = await db
    .updateTable("payments")
    .set({
      status: state.status,
      refund_amount: state.refunded > 0 ? state.refunded : null,
      refunded_at:
        state.refunded === 0
          ? null
          : state.refunded > previousRefunded
            ? now
            : payment.refunded_at,
      refund_pending_amount: state.pending,
      refund_cancelled_amount: state.cancelled,
      ...(state.releaseClaim && {
        refund_requested_at: null,
        refund_requested_amount: null,
      }),
    })
    .where("id", "=", payment.id)
    .where("status", "in", ["paid", "partially_refunded"])
    .returning("id")
    .executeTakeFirst()

  if (!updated) return { applied: false }

  const refundEmailId = state.tell
    ? await queuePaymentEmail(db, { paymentId: payment.id, kind: "refund" })
    : undefined

  return { applied: true, refundEmailId }
}
