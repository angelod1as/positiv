import { formatPaymentLinkMail } from "~/business/email/format-payment-link-mail"
import { type MailOptions, sendEmail } from "~/business/email/send-email"
import { paymentLinkMailCopy } from "~/copy/emails/payment-link"
import { kyselyDb } from "~/kysely-db"
import { appOrigin } from "~/lib/helpers/app-origin"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import { getAsaasFees } from "./asaas-fees.server"
import { buildPaymentOptions } from "./pricing"

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

  const options = buildPaymentOptions(payment.base_amount, await getAsaasFees())

  const { html, text } = await formatPaymentLinkMail({
    displayName: payment.social_name || payment.full_name || "",
    eventTitle: payment.event_title ?? "",
    eventEmoji: payment.event_emoji,
    paymentUrl: `${appOrigin(null)}${paths.payment.PAYMENT(payment.id)}`,
    dueAt: payment.due_at,
    options,
  })

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
