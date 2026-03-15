import { formatPaymentLinkMail } from "~/business/email/format-payment-link-mail"
import { type MailOptions, sendEmail } from "~/business/email/send-email"
import { buildPaymentOptions } from "~/business/payment/payment-pricing.server"
import { logger } from "~/lib/logger/logger.server"

type SendPaymentLinkEmailParams = {
  participantEmail: string
  participantName: string
  eventName: string
  ticketPrice: number
  paymentUrl: string
  expiresAt: Date
}

export async function sendPaymentLinkEmail({
  participantEmail,
  participantName,
  eventName,
  ticketPrice,
  paymentUrl,
  expiresAt,
}: SendPaymentLinkEmailParams): Promise<{ emailSent: boolean }> {
  const paymentOptions = buildPaymentOptions(ticketPrice)

  const { html, text } = formatPaymentLinkMail({
    participantName,
    eventName,
    paymentOptions,
    paymentUrl,
    expiresAt,
  })

  const options: MailOptions = {
    to: participantEmail,
    subject: `💳 Link de pagamento — ${eventName}`,
    html,
    text,
  }

  const result = await sendEmail(options)

  if (!result.success) {
    logger.error("Payment link email failed", {
      participantEmail,
      errors: result.errors,
    })
    return { emailSent: false }
  }

  return { emailSent: true }
}
