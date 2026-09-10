import { htmlToText } from "html-to-text"
import {
  paymentLinkMailTemplate,
  type PaymentLinkMailInput,
} from "./templates/payment-link-mail.template"

export const formatPaymentLinkMail = async (input: PaymentLinkMailInput) => {
  const html = paymentLinkMailTemplate(input)
  const text = htmlToText(html)

  return { text, html }
}
