import { htmlToText } from "html-to-text"
import { renderTemplate } from "~/business/cms/placeholders"
import { logger } from "~/lib/logger/logger.server"
import { paymentLinkCopyFallback } from "./payment-link-mail-copy"
import { loadPaymentLinkCopy } from "./payment-link-mail-copy.server"
import { PAYMENT_LINK_MAIL_VARIABLES } from "./payment-link-mail.variables"
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

  let rendered: { html: string; subject: string }
  try {
    rendered = render(input, copy)
  } catch (error) {
    // A failure with the code copy already in use is a real error — a refused
    // payment url, say — so let it propagate. Otherwise re-render with the code
    // copy: if that succeeds the CMS copy was at fault and we log it; if it
    // fails too, the fault was never the copy, so surface the original error.
    if (copy === paymentLinkCopyFallback) throw error
    try {
      rendered = render(input, paymentLinkCopyFallback)
    } catch {
      throw error
    }
    logger.error(
      "The payment link email copy failed to render, using the default",
      { error: error instanceof Error ? error.message : String(error) },
    )
  }

  return {
    text: htmlToText(rendered.html),
    html: rendered.html,
    subject: rendered.subject,
  }
}
