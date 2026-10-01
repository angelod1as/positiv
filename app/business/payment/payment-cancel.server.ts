import { applySchema } from "composable-functions"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import { paymentProvider } from "./payment-provider.server"
import { ACTIVE_PAYMENT_STATUSES } from "./payment-totals.server"

export const cancelPaymentSchema = zod.object({
  paymentId: zod.string().uuid(),
})

/**
 * Calls off a charge nobody has paid. Guarded on the open statuses so a payment
 * confirmed a moment ago cannot be cancelled out from under the money.
 *
 * The provider is told only after the row is ours, and a refusal there is
 * logged rather than raised: the charge is unpaid and will go overdue on their
 * side anyway, and the admin's cancellation is not worth undoing over it.
 */
export const cancelPayment = applySchema(cancelPaymentSchema)(async (values) => {
  const cancelled = await kyselyDb
    .updateTable("payments")
    .set({ status: "cancelled" })
    .where("id", "=", values.paymentId)
    .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
    .returning(["id", "provider_charge_id"])
    .executeTakeFirst()

  if (!cancelled) {
    throw new Error(paymentsCopy.errors.notCancellable)
  }

  if (cancelled.provider_charge_id) {
    try {
      // A refusal comes back as false, not as an error.
      const deleted = await paymentProvider().cancelCharge(
        cancelled.provider_charge_id,
      )
      if (!deleted) {
        logger.error("The payment provider refused to delete the cancelled charge", {
          paymentId: cancelled.id,
          chargeId: cancelled.provider_charge_id,
        })
      }
    } catch (error) {
      logger.error("Could not delete the cancelled charge at the payment provider", {
        paymentId: cancelled.id,
        chargeId: cancelled.provider_charge_id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { ok: true as const }
})
