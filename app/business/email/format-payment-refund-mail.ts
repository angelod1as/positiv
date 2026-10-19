import { htmlToText } from "html-to-text"
import { renderTemplate } from "~/business/cms/placeholders"
import {
  type PaymentRefundCopy,
  paymentRefundCopyFallback,
} from "./payment-refund-mail-copy"
import { loadPaymentRefundCopy } from "./payment-refund-mail-copy.server"
import { PAYMENT_REFUND_MAIL_VARIABLES } from "./payment-refund-mail.variables"
import { renderWithFallback } from "./render-with-fallback"
import {
  paymentRefundMailTemplate,
  type PaymentRefundMailInput,
} from "./templates/payment-refund-mail.template"

function render(input: PaymentRefundMailInput, copy: PaymentRefundCopy) {
  const html = paymentRefundMailTemplate(input, copy)
  const subject = renderTemplate(
    copy.subject,
    { evento: [input.eventEmoji, input.eventTitle].filter(Boolean).join(" ") },
    PAYMENT_REFUND_MAIL_VARIABLES.subject,
  )
  return { html, subject }
}

export const formatPaymentRefundMail = async (
  input: PaymentRefundMailInput,
) => {
  const copy = await loadPaymentRefundCopy()

  const { html, subject } = renderWithFallback(
    "payment refund",
    (chosen: PaymentRefundCopy) => render(input, chosen),
    copy,
    paymentRefundCopyFallback,
  )
  const text = htmlToText(html)

  return { text, html, subject }
}
