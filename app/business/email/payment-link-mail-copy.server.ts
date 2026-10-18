import { emailTemplatesCache } from "~/business/cms/email-templates-cache.server"
import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { paymentLinkMailContent } from "~/copy/emails/payment-link"
import { logger } from "~/lib/logger/logger.server"
import { renderInlineBlocks } from "./render-inline-portable-text"

export const PAYMENT_LINK_COPY_TIMEOUT_MS = 2_000

export type PaymentLinkCopy = {
  subject: string
  heading: string
  bodyParagraphs: string[]
}

// The code copy, served when Sanity is unreachable, slow or publishing invalid
// content, so a payment email never fails to send. The same renderer produces
// the body here as on the Sanity path, so the two cannot diverge.
export const paymentLinkCopyFallback: PaymentLinkCopy = {
  subject: paymentLinkMailContent.subject,
  heading: paymentLinkMailContent.heading,
  bodyParagraphs: renderInlineBlocks(paymentLinkMailContent.body),
}

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
