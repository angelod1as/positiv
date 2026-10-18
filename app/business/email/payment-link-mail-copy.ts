import { paymentLinkMailContent } from "~/copy/emails/payment-link"
import { renderInlineBlocks } from "./render-inline-portable-text"

export type PaymentLinkCopy = {
  subject: string
  heading: string
  bodyParagraphs: string[]
}

export const paymentLinkCopyFallback: PaymentLinkCopy = {
  subject: paymentLinkMailContent.subject,
  heading: paymentLinkMailContent.heading,
  bodyParagraphs: renderInlineBlocks(paymentLinkMailContent.body),
}
