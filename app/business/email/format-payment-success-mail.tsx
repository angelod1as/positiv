import { htmlToText } from "html-to-text"
import { paymentSuccessEmailTemplate } from "./templates/payment-success-email.template"

export const formatPaymentSuccessMail = async (
  participantName: string,
  eventTitle: string,
  eventEmoji: string | null,
  paymentMethod: string,
  amount: string,
  installments: number | null,
  paymentDate: string,
) => {
  const html = paymentSuccessEmailTemplate(
    participantName,
    eventTitle,
    eventEmoji,
    paymentMethod,
    amount,
    installments,
    paymentDate,
  )
  const text = htmlToText(html)

  return { text, html }
}
