import { htmlToText } from "html-to-text"
import { paymentLinkEmailTemplate } from "./templates/payment-link-email.template"

export const formatPaymentLinkMail = async (
  participantName: string,
  eventTitle: string,
  eventEmoji: string | null,
  paymentLink: string,
  expiresAt: Date,
) => {
  const html = paymentLinkEmailTemplate(
    participantName,
    eventTitle,
    eventEmoji,
    paymentLink,
    expiresAt,
  )
  const text = htmlToText(html)

  return { text, html }
}
