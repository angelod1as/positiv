import { formatPaymentRefundMail } from "~/business/email/format-payment-refund-mail"
import { type MailOptions, sendEmail } from "~/business/email/send-email"
import { logger } from "~/lib/logger/logger.server"

type SendPaymentRefundEmailParams = {
  participantEmail: string
  participantName: string
  eventName: string
  refundAmount: number
}

export async function sendPaymentRefundEmail({
  participantEmail,
  participantName,
  eventName,
  refundAmount,
}: SendPaymentRefundEmailParams): Promise<{ emailSent: boolean }> {
  const { html, text } = formatPaymentRefundMail({
    participantName,
    eventName,
    refundAmount,
  })

  const options: MailOptions = {
    to: participantEmail,
    subject: `Reembolso processado — ${eventName}`,
    html,
    text,
  }

  const result = await sendEmail(options)

  if (!result.success) {
    logger.error("Refund notification email failed", {
      participantEmail,
      errors: result.errors,
    })
    return { emailSent: false }
  }

  return { emailSent: true }
}
