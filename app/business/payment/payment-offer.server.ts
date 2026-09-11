import { applySchema } from "composable-functions"
import { ENV } from "varlock/env"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { reaisToCents } from "~/lib/helpers/format-currency"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import { deleteAsaasPayment } from "./asaas-client.server"
import { cancelPayment } from "./payment-cancel.server"
import { sendPaymentLinkEmail } from "./payment-emails.server"
import { ACTIVE_PAYMENT_STATUSES } from "./payment-totals.server"

const OFFER_VALID_DAYS = 7

const SETTLED_PAYMENT_STATUSES = ["paid", "partially_refunded"] as const

// The two funnel steps that come after the money. A charge sent late is not a
// reason to walk somebody back up the process, so those are left where they
// are and everything else advances -- including the stalls, "Pensar melhor"
// and "Nao Respondeu", which happen during the conversation and so before the
// payment, whatever the order the enum happens to declare them in.
const POST_PAYMENT_STATUSES = ["sent_rules", "finalised"] as const

export const createPaymentOfferSchema = zod.object({
  eventParticipantId: zod.string().uuid(),
  // The field is free text, so an admin can paste anything into it.
  // reaisToCents answers NaN for what it cannot read, and NaN reaching the
  // guards below would be refused as "must be greater than zero" -- accurate
  // sounding, and not why it failed.
  baseAmount: zod
    .union([zod.string(), zod.number()])
    .nullish()
    .transform((value) =>
      value === null || value === undefined || value === ""
        ? null
        : reaisToCents(value),
    )
    .refine((cents) => cents === null || Number.isFinite(cents), {
      error: paymentsCopy.errors.amountUnreadable,
    }),
  createdBy: zod.string().uuid().nullish(),
})

async function deleteReplacedCharges(
  replaced: { id: string; asaas_payment_id: string | null }[],
) {
  // Outside the transaction on purpose: an HTTP call inside one holds a row
  // lock for as long as the network takes, and a charge Asaas refuses to
  // delete must not undo the row the admin just created. The old charge is
  // unpaid either way and will simply go overdue there.
  for (const old of replaced) {
    if (!old.asaas_payment_id) continue
    try {
      await deleteAsaasPayment(old.asaas_payment_id)
    } catch (error) {
      logger.error("Could not delete the replaced Asaas charge", {
        paymentId: old.id,
        asaasPaymentId: old.asaas_payment_id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

/**
 * Opens the charge a participant is asked to pay, and is the only thing that
 * does. It is reached from "Enviar cobrança" and "Reenviar com outro valor" in
 * the payment modal — never from a status change, because a funnel step is a
 * note an admin keeps and an absent-minded grid edit should not delete a live
 * Asaas charge.
 *
 * The database work is one transaction — cancel what was open, insert what
 * replaces it, nudge the funnel — so two admins clicking at once cannot leave
 * two live charges; the partial unique index makes the loser fail. Only after
 * it commits does anything reach the outside world.
 */
export const createPaymentOffer = applySchema(createPaymentOfferSchema)(
  async (values) => {
    const participant = await kyselyDb
      .selectFrom("event_participants as ep")
      .innerJoin("events as e", "e.id", "ep.event_id")
      .select(["ep.id", "ep.spot_type", "e.ticket_price"])
      .where("ep.id", "=", values.eventParticipantId)
      .executeTakeFirst()

    if (!participant) {
      throw new Error(paymentsCopy.errors.participantNotFound)
    }

    // A social or staff spot owes nothing. The modal offers no charge for one,
    // so arriving here means a hand-made request rather than a flow.
    if (participant.spot_type !== "regular") {
      throw new Error(paymentsCopy.errors.freeSpot)
    }

    if (!ENV.PAYMENTS_ENABLED) {
      // No emailSent here on purpose: nothing was created, so there is no
      // charge for the modal to warn about not having announced.
      return { created: false as const, reason: "disabled" }
    }

    // Two different failures, and the admin gets to know which. Telling
    // someone who typed a zero that the event has no price is simply false,
    // and the modal shows this sentence verbatim.
    if (values.baseAmount === null && !participant.ticket_price) {
      throw new Error(paymentsCopy.errors.noAmount)
    }

    const baseAmount = values.baseAmount ?? participant.ticket_price
    if (!baseAmount || !Number.isFinite(baseAmount) || baseAmount <= 0) {
      throw new Error(paymentsCopy.errors.amountTooLow)
    }

    const dueAt = new Date(
      Date.now() + OFFER_VALID_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()

    const { replaced, payment } = await kyselyDb
      .transaction()
      .execute(async (trx) => {
        // The same lock registerManualPayment takes, for the same reason: a
        // manual payment landing between the settled check and the insert
        // would leave a participant who has just paid holding an open charge
        // and a link in their inbox. Locks only serialise the callers that
        // ask for them, and the unique index does not cover `paid`.
        await trx
          .selectFrom("event_participants")
          .select("id")
          .where("id", "=", values.eventParticipantId)
          .forUpdate()
          .executeTakeFirst()

        const settled = await trx
          .selectFrom("payments")
          .select("id")
          .where("event_participant_id", "=", values.eventParticipantId)
          .where("status", "in", [...SETTLED_PAYMENT_STATUSES])
          .executeTakeFirst()

        if (settled) {
          throw new Error(paymentsCopy.errors.alreadyPaid)
        }

        const replaced = await trx
          .updateTable("payments")
          .set({ status: "cancelled" })
          .where("event_participant_id", "=", values.eventParticipantId)
          .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
          .returning(["id", "asaas_payment_id"])
          .execute()

        const payment = await trx
          .insertInto("payments")
          .values({
            event_participant_id: values.eventParticipantId,
            kind: "asaas",
            status: "pending",
            base_amount: baseAmount,
            due_at: dueAt,
            created_by: values.createdBy ?? null,
          })
          .returningAll()
          .executeTakeFirstOrThrow()

        // The WHERE is the whole "never backwards" rule.
        await trx
          .updateTable("event_participants")
          .set({ application_status: "sent_payment_data" })
          .where("id", "=", values.eventParticipantId)
          .where("application_status", "not in", [...POST_PAYMENT_STATUSES])
          .execute()

        return { replaced, payment }
      })

    await deleteReplacedCharges(replaced)

    const email = await sendPaymentLinkEmail({ paymentId: payment.id })

    return {
      created: true as const,
      paymentId: payment.id,
      emailSent: email.success,
    }
  },
)

export const resendPaymentOfferSchema = zod.object({
  paymentId: zod.string().uuid(),
})

/**
 * The same link again, for the charge that is still open. No new row and no
 * new deadline: the participant is being reminded, not re-charged.
 */
export const resendPaymentOffer = applySchema(resendPaymentOfferSchema)(
  async (values) => {
    // The link email prices every option, which means reading the Asaas fee
    // table. With the switch off nothing may talk to Asaas, so this path is
    // gated like the one that opens a charge.
    if (!ENV.PAYMENTS_ENABLED) {
      return { reason: "disabled" }
    }

    const payment = await kyselyDb
      .selectFrom("payments")
      .select(["id", "status"])
      .where("id", "=", values.paymentId)
      .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
      .executeTakeFirst()

    if (!payment) {
      throw new Error(paymentsCopy.errors.notResendable)
    }

    const email = await sendPaymentLinkEmail({ paymentId: payment.id })

    return { emailSent: email.success }
  },
)

/**
 * Calls off whatever charge a participant has open, if any. Answers with
 * whether there was one, because the callers -- a withdrawal, for one -- want
 * to go through either way.
 */
export async function cancelActivePayment({
  eventParticipantId,
}: {
  eventParticipantId: string
}): Promise<{ cancelled: boolean }> {
  const active = await kyselyDb
    .selectFrom("payments")
    .select("id")
    .where("event_participant_id", "=", eventParticipantId)
    .where("status", "in", [...ACTIVE_PAYMENT_STATUSES])
    .executeTakeFirst()

  if (!active) return { cancelled: false }

  const result = await cancelPayment({ paymentId: active.id })

  // A charge that changed status between the select and the cancel comes back
  // refused, not raised. Nobody upstream acts on it -- a withdrawal goes
  // through regardless -- but §5.6 exists to guarantee no live charge survives
  // one, so the times it does are worth knowing about.
  if (!result.success) {
    logger.error("A withdrawal left a charge behind", {
      eventParticipantId,
      paymentId: active.id,
      errors: result.errors.map((error) => error.message),
    })
  }

  return { cancelled: result.success }
}
