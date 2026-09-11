import { formatPaymentLinkMail } from "~/business/email/format-payment-link-mail"
import { type MailOptions, sendEmail } from "~/business/email/send-email"
import { paymentLinkMailCopy } from "~/copy/emails/payment-link"
import { kyselyDb } from "~/kysely-db"
import { appOrigin } from "~/lib/helpers/app-origin"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import { getAsaasFees } from "./asaas-fees.server"
import { buildPaymentOptions } from "./pricing"
import type { PaymentOption, PaymentOptionId } from "./pricing"

type CommittedRow = {
  amount: number | null
  method: string | null
  installment_count: number | null
}

/**
 * The single option a participant has already chosen, or nothing while the
 * charge is still an open offer.
 */
function committedOption(row: CommittedRow): PaymentOption[] | null {
  if (row.amount === null || row.method === null) return null
  if (row.method !== "pix" && row.method !== "credit_card") return null

  const installmentCount = row.installment_count
  return [
    {
      id: installmentCount ? (`card_${installmentCount}` as PaymentOptionId) : "pix",
      method: row.method,
      installmentCount,
      perInstallment: installmentCount
        ? Math.ceil(row.amount / installmentCount)
        : row.amount,
      total: row.amount,
    },
  ]
}

/**
 * The link a participant is emailed when a charge opens, and again whenever an
 * admin resends it. The prices are computed at send time rather than stored:
 * the row carries the base amount Positiv nets, and what each way of paying
 * costs follows from the fee snapshot, which the payment page recomputes the
 * same way when the participant actually picks one.
 */
export async function sendPaymentLinkEmail({
  paymentId,
}: {
  paymentId: string
}): Promise<{ success: boolean }> {
  const payment = await kyselyDb
    .selectFrom("payments as p")
    .innerJoin("event_participants as ep", "ep.id", "p.event_participant_id")
    .innerJoin("events as e", "e.id", "ep.event_id")
    .innerJoin("profiles as pr", "pr.id", "ep.profile_id")
    .select([
      "p.id",
      "p.base_amount",
      "p.amount",
      "p.method",
      "p.installment_count",
      "p.due_at",
      "e.title as event_title",
      "e.emoji as event_emoji",
      "pr.email",
      "pr.full_name",
      "pr.social_name",
    ])
    .where("p.id", "=", paymentId)
    .executeTakeFirst()

  if (!payment) {
    logger.error("No payment to send a link for", { paymentId })
    return { success: false }
  }

  if (!payment.email) {
    logger.error("No mailbox to send a payment link to", { paymentId })
    return { success: false }
  }

  // Everything between here and the send is inside the guard, because the
  // charge is already committed by the time we reach it: a failure has to read
  // as an email that did not go out, not as the whole operation failing with
  // an internal sentence in the admin's face. Two things in here can raise.
  // The template refuses a url it cannot vouch for, and APP_URL is not a
  // required variable -- without one appOrigin answers nothing and the url
  // arrives schemeless. And the gross-up refuses a fee table that leaves
  // nothing to receive, which a mistyped anticipation rate produces.
  let mail: { html: string; text: string }
  try {
    // Once the participant has picked, the price is settled and the Asaas
    // charge exists at that figure -- re-pricing the seven options here would
    // quote a number the checkout will not honour, because PR 10 sends a
    // returning payer back to the invoice it already created. So a resend at
    // that point restates what they owe rather than re-offering the menu.
    const committed = committedOption(payment)
    const options =
      committed ??
      buildPaymentOptions(payment.base_amount, await getAsaasFees())

    mail = await formatPaymentLinkMail({
      displayName: payment.social_name || payment.full_name || "",
      eventTitle: payment.event_title ?? "",
      eventEmoji: payment.event_emoji,
      paymentUrl: `${appOrigin(null)}${paths.payment.PAYMENT(payment.id)}`,
      dueAt: payment.due_at,
      options,
    })
  } catch (error) {
    logger.error("Could not build the payment link email", {
      paymentId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false }
  }

  const { html, text } = mail

  const mailOptions: MailOptions = {
    to: payment.email,
    subject: paymentLinkMailCopy.subject(
      [payment.event_emoji, payment.event_title].filter(Boolean).join(" "),
    ),
    html,
    text,
  }

  const result = await sendEmail(mailOptions)

  if (!result.success) {
    logger.error("Could not send the payment link email", { paymentId })
    return { success: false }
  }

  return { success: true }
}
