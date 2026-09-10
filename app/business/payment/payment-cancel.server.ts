import { applySchema } from "composable-functions"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import { deleteAsaasPayment } from "./asaas-client.server"
import { ACTIVE_PAYMENT_STATUSES } from "./payment-totals.server"

export const cancelPaymentSchema = zod.object({
  paymentId: zod.string().uuid(),
})

/**
 * Calls off a charge nobody has paid. Guarded on the open statuses so a payment
 * confirmed a moment ago cannot be cancelled out from under the money.
 *
 * Asaas is told only after the row is ours, and a refusal there is logged
 * rather than raised: the charge is unpaid and will go overdue on their side
 * anyway, and the admin's cancellation is not worth undoing over it.
 */
export const cancelPayment = applySchema(cancelPaymentSchema)(async (values) => {
  const cancelled = await kyselyDb
    .updateTable("payments")
    .set({ status: "cancelled" })
    .where("id", "=", values.paymentId)
    .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
    .returning(["id", "asaas_payment_id"])
    .executeTakeFirst()

  if (!cancelled) {
    throw new Error(paymentsCopy.errors.notCancellable)
  }

  if (cancelled.asaas_payment_id) {
    try {
      await deleteAsaasPayment(cancelled.asaas_payment_id)
    } catch (error) {
      logger.error("Could not delete the cancelled Asaas charge", {
        paymentId: cancelled.id,
        asaasPaymentId: cancelled.asaas_payment_id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { ok: true as const }
})
