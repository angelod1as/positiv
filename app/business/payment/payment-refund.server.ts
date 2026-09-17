import { applySchema } from "composable-functions"
import { paymentsCopy } from "~/copy/payments"
import { kyselyDb } from "~/kysely-db"
import { reaisToCents } from "~/lib/helpers/format-currency"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import {
  AsaasError,
  listAsaasInstallmentPayments,
  refundAsaasPayment,
} from "./asaas-client.server"
import { sendPaymentRefundEmail } from "./payment-emails.server"
import { splitRefund } from "./refund-split"

export const markManualRefundedSchema = zod.object({
  paymentId: zod.string().uuid(),
  // An empty field is the form saying "the whole amount", so it has to reach
  // the handler as null. `reaisToCents("")` answers NaN, which is neither an
  // amount nor nullish, and would fail every full refund the modal offers.
  amount: zod
    .union([zod.string(), zod.number()])
    .transform((value) =>
      typeof value === "string" && value.trim() === ""
        ? null
        : reaisToCents(value),
    )
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
      .select(["amount", "status", "kind"])
      .where("id", "=", values.paymentId)
      .executeTakeFirst()

    // Only a payment taken by hand can be given back by hand. Marking an Asaas
    // row refunded here would move nothing at Asaas, leaving the participant's
    // money where it is and Positiv's ledger saying otherwise.
    if (
      !payment ||
      payment.kind !== "manual" ||
      payment.status !== "paid" ||
      payment.amount === null
    ) {
      throw new Error(paymentsCopy.errors.notRefundable)
    }

    const refundAmount = values.amount ?? payment.amount

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      throw new Error(paymentsCopy.errors.refundAmountRequired)
    }

    if (refundAmount > payment.amount) {
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
      .where("kind", "=", "manual")
      .returning("id")
      .executeTakeFirst()

    if (!updated) {
      throw new Error(paymentsCopy.errors.notRefundable)
    }

    // The row has already moved. A notice that cannot be sent is worth a log,
    // never an error in the admin's face over money that is genuinely back.
    try {
      await sendPaymentRefundEmail({ paymentId: values.paymentId })
    } catch (error) {
      logger.error("Refund recorded, but the notice could not be sent", {
        paymentId: values.paymentId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return { ok: true as const }
  },
)

export const requestRefundSchema = zod.object({
  paymentId: zod.string().uuid(),
  amount: zod
    .union([zod.string(), zod.number()])
    .transform((value) =>
      typeof value === "string" && value.trim() === ""
        ? null
        : reaisToCents(value),
    )
    .nullish(),
  // Blank the same way the amount is: a field left empty is no reason, and the
  // Asaas call should not tell two kinds of nothing apart.
  reason: zod
    .string()
    .transform((value) => (value.trim() === "" ? null : value))
    .nullish(),
})

/**
 * Asks Asaas to give the money back.
 *
 * `refund_requested_at` is claimed first, with a guarded UPDATE: whoever wins
 * that write is the only one who calls Asaas, so a double click — or two
 * admins — cannot refund twice. The status stays `paid` until the webhook says
 * the money actually left; a refund takes days on a card, and claiming
 * otherwise would show the participant a refund that has not happened.
 *
 * What goes back is `asaas_net`, both by default and at most: refunding the
 * gross is a full refund to Asaas, and Asaas never returns the anticipation
 * fee. A card plan is refunded one charge at a time for the same reason —
 * `/installments/{id}/refund` can only give the whole plan back.
 */
export const requestRefund = applySchema(requestRefundSchema)(
  async (values) => {
    const payment = await kyselyDb
      .selectFrom("payments")
      .select([
        "id",
        "amount",
        "asaas_net",
        "status",
        "kind",
        "asaas_payment_id",
        "asaas_installment_id",
      ])
      .where("id", "=", values.paymentId)
      .executeTakeFirst()

    if (!payment || payment.kind !== "asaas") {
      throw new Error(paymentsCopy.errors.notAsaasRefundable)
    }

    if (payment.status !== "paid" || payment.amount === null) {
      throw new Error(paymentsCopy.errors.notRefundable)
    }

    // What Positiv actually received, which is what goes back. A row can be
    // paid before the webhook reports it, and the only other figure available
    // then is the gross -- refunding which is a full refund, and Asaas keeps
    // the anticipation on one. Waiting a moment costs nothing.
    if (payment.asaas_net === null) {
      throw new Error(paymentsCopy.errors.refundNetNotReported)
    }

    const refundable = payment.asaas_net
    const amount = values.amount ?? refundable

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(paymentsCopy.errors.refundAmountRequired)
    }

    if (amount > refundable) {
      throw new Error(paymentsCopy.errors.refundAboveReceived)
    }

    const claimed = await kyselyDb
      .updateTable("payments")
      .set({
        refund_requested_at: new Date().toISOString(),
        refund_requested_amount: amount,
      })
      .where("id", "=", payment.id)
      .where("status", "=", "paid")
      .where("refund_requested_at", "is", null)
      .returning("id")
      .executeTakeFirst()

    if (!claimed) {
      throw new Error(paymentsCopy.errors.refundAlreadyRequested)
    }

    const description = values.reason ?? null
    let given = 0
    // The charge being asked for at the moment it fails. On a plan that is one
    // of several, and the plan's first is rarely the one Asaas refused.
    let charge = payment.asaas_payment_id
    // Whether a refund was ever put to Asaas. Before that, a failure -- the
    // plan could not be listed, the split refused -- cannot have moved money.
    let sent = false

    try {
      if (payment.asaas_installment_id) {
        const parts = await listAsaasInstallmentPayments(
          payment.asaas_installment_id,
        )
        // Sequentially: Asaas queues them anyway, and an ordered failure is
        // the difference between "two of three went back" and a guess.
        for (const share of splitRefund(amount, parts)) {
          charge = share.id
          sent = true
          await refundAsaasPayment(share.id, {
            amount: share.amount,
            description,
          })
          given += share.amount
        }
      } else if (payment.asaas_payment_id) {
        sent = true
        await refundAsaasPayment(payment.asaas_payment_id, {
          amount,
          description,
        })
        given = amount
      } else {
        throw new Error(paymentsCopy.errors.notAsaasRefundable)
      }
    } catch (error) {
      // The claim is released only when no money can have moved: nothing was
      // put to Asaas, or Asaas answered the first refund with a refusal. A
      // timeout, a dropped connection, a 5xx or an answer that does not parse
      // say nothing about whether the refund happened, and neither does half a
      // plan going back. Releasing the claim on any of those would bring the
      // button back, and the next click would refund the same money again.
      const refused =
        error instanceof AsaasError && error.status >= 400 && error.status < 500
      const nothingMoved = given === 0 && (!sent || refused)

      if (nothingMoved) {
        await kyselyDb
          .updateTable("payments")
          .set({ refund_requested_at: null, refund_requested_amount: null })
          .where("id", "=", payment.id)
          .execute()
      }

      logger.error("Asaas refused the refund", {
        paymentId: payment.id,
        asaasPaymentId: charge,
        asaasInstallmentId: payment.asaas_installment_id,
        alreadyRefunded: given,
        error: error instanceof Error ? error.message : String(error),
      })

      if (nothingMoved) throw error
      throw new Error(
        given > 0
          ? paymentsCopy.errors.refundPartiallyApplied
          : paymentsCopy.errors.refundOutcomeUnknown,
      )
    }

    return { requested: true as const }
  },
)
