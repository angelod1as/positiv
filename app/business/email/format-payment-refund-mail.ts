import { htmlToText } from "html-to-text"
import { paymentRefundMailTemplate } from "./templates/payment-refund-mail.template"

type FormatPaymentRefundMailParams = {
  participantName: string
  eventName: string
  refundAmount: number
}

export function formatPaymentRefundMail(params: FormatPaymentRefundMailParams) {
  const html = paymentRefundMailTemplate(params)
  const text = htmlToText(html)
  return { html, text }
}
