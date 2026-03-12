import { htmlToText } from "html-to-text"
import { paymentFailureEmailTemplate } from "./templates/payment-failure-email.template"

export const formatPaymentFailureMail = async (
  participantName: string,
  eventTitle: string,
  eventEmoji: string | null,
  failureReason: string | null,
  paymentLink: string,
) => {
  const html = paymentFailureEmailTemplate(
    participantName,
    eventTitle,
    eventEmoji,
    failureReason,
    paymentLink,
  )
  const text = htmlToText(html)

  return { text, html }
}
