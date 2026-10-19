import { paymentConfirmedMailContent } from "~/copy/emails/payment-confirmed"
import { renderInlineBlocks } from "./render-inline-portable-text"

export type PaymentConfirmedCopy = {
  subject: string
  heading: string
  bodyParagraphs: string[]
  cta: string
  closingParagraphs: string[]
}

export const paymentConfirmedCopyFallback: PaymentConfirmedCopy = {
  subject: paymentConfirmedMailContent.subject,
  heading: paymentConfirmedMailContent.heading,
  bodyParagraphs: renderInlineBlocks(paymentConfirmedMailContent.body),
  cta: paymentConfirmedMailContent.cta,
  closingParagraphs: renderInlineBlocks(paymentConfirmedMailContent.closing),
}
