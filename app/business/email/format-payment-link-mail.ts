import { htmlToText } from "html-to-text"
import { renderTemplate } from "~/business/cms/placeholders"
import { paymentLinkCopyFallback } from "./payment-link-mail-copy"
import { loadPaymentLinkCopy } from "./payment-link-mail-copy.server"
import { PAYMENT_LINK_MAIL_VARIABLES } from "./payment-link-mail.variables"
import { renderWithFallback } from "./render-with-fallback"
import type { PaymentLinkCopy } from "./payment-link-mail-copy"
import {
  paymentLinkMailTemplate,
  type PaymentLinkMailInput,
} from "./templates/payment-link-mail.template"

function render(input: PaymentLinkMailInput, copy: PaymentLinkCopy) {
  const html = paymentLinkMailTemplate(input, copy)
  const subject = renderTemplate(
    copy.subject,
    { evento: [input.eventEmoji, input.eventTitle].filter(Boolean).join(" ") },
    PAYMENT_LINK_MAIL_VARIABLES.subject,
  )
  return { html, subject }
}

export const formatPaymentLinkMail = async (input: PaymentLinkMailInput) => {
  const copy = await loadPaymentLinkCopy()

  const rendered = renderWithFallback(
    "payment link",
    (chosen: PaymentLinkCopy) => render(input, chosen),
    copy,
    paymentLinkCopyFallback,
  )

  return {
    text: htmlToText(rendered.html),
    html: rendered.html,
    subject: rendered.subject,
  }
}
