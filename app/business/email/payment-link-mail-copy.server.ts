import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { loadEmailCopy } from "./email-copy.server"
import {
  type PaymentLinkCopy,
  paymentLinkCopyFallback,
} from "./payment-link-mail-copy"
import { renderInlineBlocks } from "./render-inline-portable-text"

type EmailTemplatesCache = { get(): Promise<EmailTemplates | null> }

function toCopy(templates: EmailTemplates): PaymentLinkCopy {
  const { subject, heading, body } = templates.paymentLink
  return { subject, heading, bodyParagraphs: renderInlineBlocks(body) }
}

export function loadPaymentLinkCopy(
  cache?: EmailTemplatesCache,
): Promise<PaymentLinkCopy> {
  return loadEmailCopy("payment link", toCopy, paymentLinkCopyFallback, cache)
}
