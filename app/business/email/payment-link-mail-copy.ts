import { paymentLinkMailContent } from "~/copy/emails/payment-link"
import { renderInlineBlocks } from "./render-inline-portable-text"

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
