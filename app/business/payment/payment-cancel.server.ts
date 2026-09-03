import { applySchema } from "composable-functions"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"
import { ACTIVE_PAYMENT_STATUSES } from "./payment-totals.server"

export const cancelPaymentSchema = zod.object({
  paymentId: zod.string().uuid(),
})

/**
 * Calls off a charge nobody has paid. Guarded on the open statuses so a payment
 * confirmed a moment ago cannot be cancelled out from under the money.
 *
 * POS-528 extends this to delete the charge on Asaas as well.
 */
export const cancelPayment = applySchema(cancelPaymentSchema)(async (values) => {
  const cancelled = await kyselyDb
    .updateTable("payments")
    .set({ status: "cancelled" })
    .where("id", "=", values.paymentId)
    .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
    .returning("id")
    .executeTakeFirst()

  if (!cancelled) {
    throw new Error(paymentsCopy.errors.notCancellable)
  }

  return { ok: true as const }
})
