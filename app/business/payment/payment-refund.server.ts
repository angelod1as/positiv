import { applySchema } from "composable-functions"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { reaisToCents } from "~/lib/helpers/format-currency"
import { zod } from "~/lib/helpers/zod"

export const markManualRefundedSchema = zod.object({
  paymentId: zod.string().uuid(),
  amount: zod
    .union([zod.string(), zod.number()])
    .transform(reaisToCents)
    .nullish(),
})

/**
 * Money given back outside Asaas. The UPDATE is guarded on the status it
 * expects, so a second click — or a second admin — writes nothing instead of
 * refunding twice.
 *
 * A refund of zero is refused whatever the payment: a courtesy spot settled at
 * zero has nothing to give back.
 */
export const markManualRefunded = applySchema(markManualRefundedSchema)(
  async (values) => {
    const payment = await kyselyDb
      .selectFrom("payments")
      .select(["amount", "status"])
      .where("id", "=", values.paymentId)
      .executeTakeFirst()

    if (!payment || payment.status !== "paid" || payment.amount === null) {
      throw new Error(paymentsCopy.errors.notRefundable)
    }

    const refundAmount = values.amount ?? payment.amount

    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0 ||
      refundAmount > payment.amount
    ) {
      throw new Error(paymentsCopy.errors.refundTooLarge)
    }

    const updated = await kyselyDb
      .updateTable("payments")
      .set({
        status:
          refundAmount === payment.amount ? "refunded" : "partially_refunded",
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
      })
      .where("id", "=", values.paymentId)
      .where("status", "=", "paid")
      .returning("id")
      .executeTakeFirst()

    if (!updated) {
      throw new Error(paymentsCopy.errors.notRefundable)
    }

    return { ok: true as const }
  },
)
