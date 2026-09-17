import { htmlToText } from "html-to-text"
import {
  paymentRefundMailTemplate,
  type PaymentRefundMailInput,
} from "./templates/payment-refund-mail.template"

export const formatPaymentRefundMail = async (
  input: PaymentRefundMailInput,
) => {
  const html = paymentRefundMailTemplate(input)
  const text = htmlToText(html)

  return { text, html }
}
