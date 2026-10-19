import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { type EmailTemplatesCache, loadEmailCopy } from "./email-copy.server"
import {
  type PaymentRefundCopy,
  paymentRefundCopyFallback,
} from "./payment-refund-mail-copy"
import { renderInlineBlocks } from "./render-inline-portable-text"

function toCopy(content: EmailTemplates["paymentRefund"]): PaymentRefundCopy {
  const { subject, heading, body, cta } = content
  return { subject, heading, bodyParagraphs: renderInlineBlocks(body), cta }
}

export function loadPaymentRefundCopy(
  cache?: EmailTemplatesCache,
): Promise<PaymentRefundCopy> {
  return loadEmailCopy("payment refund", "paymentRefund", toCopy, paymentRefundCopyFallback, cache)
}
