import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { loadEmailCopy } from "./email-copy.server"
import {
  type PaymentConfirmedCopy,
  paymentConfirmedCopyFallback,
} from "./payment-confirmed-mail-copy"
import { renderInlineBlocks } from "./render-inline-portable-text"

type EmailTemplatesCache = { get(): Promise<EmailTemplates | null> }

function toCopy(templates: EmailTemplates): PaymentConfirmedCopy {
  const { subject, heading, body, cta, closing } = templates.paymentConfirmed
  return {
    subject,
    heading,
    bodyParagraphs: renderInlineBlocks(body),
    cta,
    closingParagraphs: renderInlineBlocks(closing),
  }
}

export function loadPaymentConfirmedCopy(
  cache?: EmailTemplatesCache,
): Promise<PaymentConfirmedCopy> {
  return loadEmailCopy(
    "payment confirmed",
    toCopy,
    paymentConfirmedCopyFallback,
    cache,
  )
}
