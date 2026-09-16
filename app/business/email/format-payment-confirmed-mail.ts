import { htmlToText } from "html-to-text"
import {
  paymentConfirmedMailTemplate,
  type PaymentConfirmedMailInput,
} from "./templates/payment-confirmed-mail.template"

export const formatPaymentConfirmedMail = async (
  input: PaymentConfirmedMailInput,
) => {
  const html = paymentConfirmedMailTemplate(input)
  const text = htmlToText(html)

  return { text, html }
}
