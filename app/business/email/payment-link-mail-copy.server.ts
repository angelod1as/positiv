import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { type EmailTemplatesCache, loadEmailCopy } from "./email-copy.server"
import {
  type PaymentLinkCopy,
  paymentLinkCopyFallback,
} from "./payment-link-mail-copy"
import { renderInlineBlocks } from "./render-inline-portable-text"

function toCopy(content: EmailTemplates["paymentLink"]): PaymentLinkCopy {
  const { subject, heading, body } = content
  return { subject, heading, bodyParagraphs: renderInlineBlocks(body) }
}

export function loadPaymentLinkCopy(
  cache?: EmailTemplatesCache,
): Promise<PaymentLinkCopy> {
  return loadEmailCopy("payment link", "paymentLink", toCopy, paymentLinkCopyFallback, cache)
}
