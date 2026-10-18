import { emailTemplatesCache } from "~/business/cms/email-templates-cache.server"
import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { logger } from "~/lib/logger/logger.server"
import {
  type PaymentLinkCopy,
  paymentLinkCopyFallback,
} from "./payment-link-mail-copy"
import { renderInlineBlocks } from "./render-inline-portable-text"

export const PAYMENT_LINK_COPY_TIMEOUT_MS = 2_000

export { paymentLinkCopyFallback }
export type { PaymentLinkCopy }

type EmailTemplatesCache = { get(): Promise<EmailTemplates | null> }

function toCopy(templates: EmailTemplates | null): PaymentLinkCopy {
  if (!templates) return paymentLinkCopyFallback
  const { subject, heading, body } = templates.paymentLink
  return { subject, heading, bodyParagraphs: renderInlineBlocks(body) }
}

export async function loadPaymentLinkCopy(
  cache: EmailTemplatesCache = emailTemplatesCache,
): Promise<PaymentLinkCopy> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(new Error(`Sanity took over ${PAYMENT_LINK_COPY_TIMEOUT_MS}ms`)),
      PAYMENT_LINK_COPY_TIMEOUT_MS,
    )
  })

  try {
    return toCopy(await Promise.race([cache.get(), timeout]))
  } catch (error) {
    logger.error(
      "Could not load the payment link email copy, using the default",
      { error: error instanceof Error ? error.message : String(error) },
    )
    return paymentLinkCopyFallback
  } finally {
    clearTimeout(timer)
  }
}
