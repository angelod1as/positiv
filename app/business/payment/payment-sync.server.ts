import { applySchema } from "composable-functions"
import { sql } from "kysely"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import {
  getAsaasInstallmentRefunds,
  getAsaasPaymentRefunds,
} from "./provider/asaas/asaas-client.server"
import { asaasErrorMessage } from "./provider/asaas/asaas-error-message"
import { deliverPaymentEmail } from "./payment-email-outbox.server"
import { applyRefundTally } from "./refund-apply.server"
import { tallyRefunds } from "./refund-state"

export const syncPaymentSchema = zod.object({ paymentId: zod.string().uuid() })

/**
 * Reads a payment's refunds straight from Asaas and writes them onto the row
 * the way the webhook would. The webhook only knows what
 * Asaas chose to send, and when: a refund still "em progresso" is never an
 * event, and a delivery lost while the endpoint was down leaves the row
 * behind. This is how the admin -- and the sync job -- catch up.
 *
 * Asaas is read before the transaction opens: an HTTP call has no business
 * holding a row lock for as long as the network takes.
 */
export const syncPaymentFromAsaas = applySchema(syncPaymentSchema)(
  async (values) => {
    const payment = await kyselyDb
      .selectFrom("payments")
      .select(["kind", "asaas_payment_id", "asaas_installment_id"])
      .where("id", "=", values.paymentId)
      .executeTakeFirst()

    if (!payment || payment.kind !== "asaas" || !payment.asaas_payment_id) {
      throw new Error(paymentsCopy.errors.notSyncable)
    }

    // Recorded before Asaas is asked, so a payment Asaas cannot answer about
    // does not stay first in the sync job's line.
    await kyselyDb
      .updateTable("payments")
      .set({ refunds_sync_attempted_at: new Date().toISOString() })
      .where("id", "=", values.paymentId)
      .execute()

    const plan = payment.asaas_installment_id
    let refunds: Awaited<ReturnType<typeof getAsaasPaymentRefunds>>
    try {
      refunds = plan
        ? await getAsaasInstallmentRefunds(plan)
        : await getAsaasPaymentRefunds(payment.asaas_payment_id)
    } catch (error) {
      logger.error("Could not read the payment from Asaas", {
        paymentId: values.paymentId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error(asaasErrorMessage(error, "sync"))
    }

    const syncedAt = new Date().toISOString()

    const refundEmailId = await kyselyDb.transaction().execute(async (trx) => {
      // Locked like the webhook locks it, so the two cannot both decide the
      // refund is complete and both send the notice.
      const row = await trx
        .selectFrom("payments")
        .selectAll()
        .where("id", "=", values.paymentId)
        .forUpdate()
        .executeTakeFirstOrThrow()

      const { refundEmailId } = await applyRefundTally(
        trx,
        row,
        tallyRefunds(refunds),
      )

      await trx
        .updateTable("payments")
        .set({ refunds_synced_at: syncedAt })
        .where("id", "=", values.paymentId)
        .execute()

      return refundEmailId
    })

    if (refundEmailId) {
      try {
        await deliverPaymentEmail(refundEmailId)
      } catch (error) {
        logger.error("Money went back, but the notice could not be sent", {
          paymentId: values.paymentId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { ok: true as const }
  },
)

// A batch small enough to stay well inside Asaas's rate limits every run.
const SYNC_BATCH = 20
// A row read this recently is left for the next run.
const SYNC_AGAIN_AFTER_MINUTES = 10

/**
 * The payments Asaas may still have news about, read one by one: a refund
 * under way and not yet complete, or one Asaas lists as still on its way.
 * Everything else is settled, and reading it again would only spend the rate
 * limit.
 *
 * Called by the sync-payment-refunds job. One payment Asaas cannot answer
 * about is logged and skipped, never the end of the run.
 */
export async function syncOpenPayments(): Promise<{
  synced: number
  failed: number
}> {
  const now = Date.now()
  const readBefore = new Date(
    now - SYNC_AGAIN_AFTER_MINUTES * 60 * 1000,
  ).toISOString()

  const candidates = await kyselyDb
    .selectFrom("payments")
    .select("id")
    .where("kind", "=", "asaas")
    .where("asaas_payment_id", "is not", null)
    .where("status", "in", ["paid", "partially_refunded"])
    .where((eb) =>
      eb.or([
        eb("refunds_sync_attempted_at", "is", null),
        eb("refunds_sync_attempted_at", "<", readBefore),
      ]),
    )
    .where((eb) =>
      eb.or([
        eb.and([
          eb("refund_requested_at", "is not", null),
          eb.or([
            eb("refund_amount", "is", null),
            eb("refund_amount", "<", eb.ref("refund_requested_amount")),
          ]),
        ]),
        eb("refund_pending_amount", ">", 0),
      ]),
    )
    .orderBy("refunds_sync_attempted_at", sql`asc nulls first`)
    .limit(SYNC_BATCH)
    .execute()

  let synced = 0
  let failed = 0
  for (const { id } of candidates) {
    const result = await syncPaymentFromAsaas({ paymentId: id })
    if (result.success) synced += 1
    else failed += 1
  }

  return { synced, failed }
}
