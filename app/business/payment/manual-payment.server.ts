import { applySchema } from "composable-functions"
import { fromZonedTime } from "date-fns-tz"
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
    // The admin typed a day in São Paulo, not an instant. Read as UTC it lands
    // at midnight, which every screen then formats back as the day before.
    const paidAt = fromZonedTime(values.paidAt, "America/Sao_Paulo").toISOString()

    // Checking for an open charge and writing the payment are one statement.
    // Apart, a charge opening between the two would be recorded as paid and
    // charged, and the participant would be asked for money twice.
    const write = kyselyDb.transaction().execute(async (trx) => {
      await trx
        .selectFrom("event_participants")
        .select("id")
        .where("id", "=", values.eventParticipantId)
        .forUpdate()
        .executeTakeFirst()

      const open = await trx
        .selectFrom("payments")
        .select("id")
        .where("event_participant_id", "=", values.eventParticipantId)
        .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
        .executeTakeFirst()

      if (open) {
        throw new Error(paymentsCopy.errors.activeChargeExists)
      }

      await trx
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
    })

    // Whatever the database has to say about a stale participant id or a
    // violated constraint is for the log, not for the admin's screen.
    await write.catch((error) => {
      if (
        error instanceof Error &&
        error.message === paymentsCopy.errors.activeChargeExists
      ) {
        throw error
      }

      console.error("Failed to record a manual payment", error)
      throw new Error(paymentsCopy.errors.generic)
    })

    return { ok: true as const }
  },
)
