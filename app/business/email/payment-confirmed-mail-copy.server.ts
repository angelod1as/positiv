import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { type EmailTemplatesCache, loadEmailCopy } from "./email-copy.server"
import {
  type PaymentConfirmedCopy,
  paymentConfirmedCopyFallback,
} from "./payment-confirmed-mail-copy"
import { renderInlineBlocks } from "./render-inline-portable-text"

function toCopy(content: EmailTemplates["paymentConfirmed"]): PaymentConfirmedCopy {
  const { subject, heading, body, cta, closing } = content
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
    "paymentConfirmed",
    toCopy,
    paymentConfirmedCopyFallback,
    cache,
  )
}
