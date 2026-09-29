import { applySchema } from "composable-functions"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import {
  getAsaasInstallmentRefunds,
  getAsaasPaymentRefunds,
  listAsaasAnticipations,
} from "./asaas-client.server"
import { asaasErrorMessage } from "./asaas-error-message"
import { summarizeAnticipations } from "./anticipation-state"
import { deliverPaymentEmail } from "./payment-email-outbox.server"
import { applyRefundTally } from "./refund-apply.server"
import { tallyRefunds } from "./refund-state"

export const syncPaymentSchema = zod.object({ paymentId: zod.string().uuid() })

/**
 * Reads a payment's refunds and anticipation straight from Asaas and writes
 * them onto the row the way the webhook would. The webhook only knows what
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
      .select(["kind", "method", "asaas_payment_id", "asaas_installment_id"])
      .where("id", "=", values.paymentId)
      .executeTakeFirst()

    if (!payment || payment.kind !== "asaas" || !payment.asaas_payment_id) {
      throw new Error(paymentsCopy.errors.notSyncable)
    }

    const plan = payment.asaas_installment_id
    let refunds: Awaited<ReturnType<typeof getAsaasPaymentRefunds>>
    let anticipations: Awaited<ReturnType<typeof listAsaasAnticipations>>
    try {
      refunds = plan
        ? await getAsaasInstallmentRefunds(plan)
        : await getAsaasPaymentRefunds(payment.asaas_payment_id)
      // Only a card is ever anticipated.
      anticipations =
        payment.method === "credit_card"
          ? await listAsaasAnticipations(
              plan
                ? { installment: plan }
                : { payment: payment.asaas_payment_id },
            )
          : []
    } catch (error) {
      logger.error("Could not read the payment from Asaas", {
        paymentId: values.paymentId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error(asaasErrorMessage(error, "sync"))
    }

    const syncedAt = new Date().toISOString()
    const anticipation = summarizeAnticipations(anticipations)

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

      // Written whatever the status: a payment already refunded in full can
      // still have an anticipation worth knowing about.
      await trx
        .updateTable("payments")
        .set({
          anticipation_fee: anticipation.fee,
          anticipation_status: anticipation.status,
          refunds_synced_at: syncedAt,
        })
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
