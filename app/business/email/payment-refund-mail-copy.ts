import { paymentRefundMailContent } from "~/copy/emails/payment-refund"
import { renderInlineBlocks } from "./render-inline-portable-text"

export type PaymentRefundCopy = {
  subject: string
  heading: string
  bodyParagraphs: string[]
  cta: string
}

export const paymentRefundCopyFallback: PaymentRefundCopy = {
  subject: paymentRefundMailContent.subject,
  heading: paymentRefundMailContent.heading,
  bodyParagraphs: renderInlineBlocks(paymentRefundMailContent.body),
  cta: paymentRefundMailContent.cta,
}
