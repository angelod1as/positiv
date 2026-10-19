import { htmlToText } from "html-to-text"
import { renderTemplate } from "~/business/cms/placeholders"
import {
  type PaymentConfirmedCopy,
  paymentConfirmedCopyFallback,
} from "./payment-confirmed-mail-copy"
import { loadPaymentConfirmedCopy } from "./payment-confirmed-mail-copy.server"
import { PAYMENT_CONFIRMED_MAIL_VARIABLES } from "./payment-confirmed-mail.variables"
import { renderWithFallback } from "./render-with-fallback"
import {
  paymentConfirmedMailTemplate,
  type PaymentConfirmedMailInput,
} from "./templates/payment-confirmed-mail.template"

function render(input: PaymentConfirmedMailInput, copy: PaymentConfirmedCopy) {
  const html = paymentConfirmedMailTemplate(input, copy)
  const subject = renderTemplate(
    copy.subject,
    { evento: [input.eventEmoji, input.eventTitle].filter(Boolean).join(" ") },
    PAYMENT_CONFIRMED_MAIL_VARIABLES.subject,
  )
  return { html, subject }
}

export const formatPaymentConfirmedMail = async (
  input: PaymentConfirmedMailInput,
) => {
  const copy = await loadPaymentConfirmedCopy()

  const { html, subject } = renderWithFallback(
    "payment confirmed",
    (chosen: PaymentConfirmedCopy) => render(input, chosen),
    copy,
    paymentConfirmedCopyFallback,
  )
  const text = htmlToText(html)

  return { text, html, subject }
}
