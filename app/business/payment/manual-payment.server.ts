import { applySchema } from "composable-functions"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { reaisToCents } from "~/lib/helpers/format-currency"
import { zod } from "~/lib/helpers/zod"
import { ACTIVE_PAYMENT_STATUSES } from "./payment-totals.server"

export const manualPaymentSchema = zod.object({
  eventParticipantId: zod.string().uuid(),
  amount: zod
    .union([zod.string(), zod.number()])
    .transform(reaisToCents)
    .refine((cents) => Number.isFinite(cents) && cents >= 0, {
      error: paymentsCopy.errors.amountRequired,
    }),
  method: zod.enum(["pix", "cash", "transfer", "other"]),
  // The date is read back with `new Date`, which answers an Invalid Date for
  // anything it cannot parse and then throws on toISOString. Refusing it here
  // makes that a validation message instead of a RangeError.
  paidAt: zod.iso.date(),
  note: zod.string().nullish(),
  createdBy: zod.string().uuid().nullish(),
})

/**
 * Money that arrived outside Asaas: a transfer, cash at the door, a courtesy
 * settled by hand. `base_amount` equals `amount` because there is no fee and
 * nothing was negotiated separately — what arrived is what was agreed.
 *
 * Zero is a real amount: it settles a staff or social spot that owed nothing.
 * The schema is what keeps an unparsed field from arriving here as one.
 */
export const registerManualPayment = applySchema(manualPaymentSchema)(
  async (values) => {
    const open = await kyselyDb
      .selectFrom("payments")
      .select("id")
      .where("event_participant_id", "=", values.eventParticipantId)
      .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
      .executeTakeFirst()

    if (open) {
      throw new Error(paymentsCopy.errors.activeChargeExists)
    }

    const paidAt = new Date(values.paidAt).toISOString()

    await kyselyDb
      .insertInto("payments")
      .values({
        event_participant_id: values.eventParticipantId,
        kind: "manual",
        status: "paid",
        method: values.method,
        base_amount: values.amount,
        amount: values.amount,
        paid_at: paidAt,
        due_at: paidAt,
        note: values.note ?? null,
        created_by: values.createdBy ?? null,
      })
      .execute()

    return { ok: true as const }
  },
)
