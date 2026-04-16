import { htmlToText } from "html-to-text"
import type { PaymentOption } from "~/business/email/payment-email.types"
import { paymentLinkMailTemplate } from "./templates/payment-link-mail.template"

type FormatPaymentLinkMailParams = {
  participantName: string
  eventName: string
  paymentOptions: PaymentOption[]
  paymentUrl: string
  expiresAt: Date
}

export function formatPaymentLinkMail(params: FormatPaymentLinkMailParams) {
  const html = paymentLinkMailTemplate(params)
  const text = htmlToText(html)
  return { html, text }
}
