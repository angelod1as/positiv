import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { loadEmailCopy } from "./email-copy.server"
import {
  type PaymentRefundCopy,
  paymentRefundCopyFallback,
} from "./payment-refund-mail-copy"
import { renderInlineBlocks } from "./render-inline-portable-text"

type EmailTemplatesCache = { get(): Promise<EmailTemplates | null> }

function toCopy(templates: EmailTemplates): PaymentRefundCopy {
  const { subject, heading, body, cta } = templates.paymentRefund
  return { subject, heading, bodyParagraphs: renderInlineBlocks(body), cta }
}

export function loadPaymentRefundCopy(
  cache?: EmailTemplatesCache,
): Promise<PaymentRefundCopy> {
  return loadEmailCopy("payment refund", toCopy, paymentRefundCopyFallback, cache)
}
