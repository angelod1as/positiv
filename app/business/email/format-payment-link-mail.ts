import { htmlToText } from "html-to-text"
import { renderTemplate } from "~/business/cms/placeholders"
import { loadPaymentLinkCopy } from "./payment-link-mail-copy.server"
import { PAYMENT_LINK_MAIL_VARIABLES } from "./payment-link-mail.variables"
import {
  paymentLinkMailTemplate,
  type PaymentLinkMailInput,
} from "./templates/payment-link-mail.template"

export const formatPaymentLinkMail = async (input: PaymentLinkMailInput) => {
  const copy = await loadPaymentLinkCopy()
  const html = paymentLinkMailTemplate(input, copy)
  const text = htmlToText(html)
  const subject = renderTemplate(
    copy.subject,
    { evento: [input.eventEmoji, input.eventTitle].filter(Boolean).join(" ") },
    PAYMENT_LINK_MAIL_VARIABLES.subject,
  )

  return { text, html, subject }
}
