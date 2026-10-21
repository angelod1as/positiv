import { applicationMailContent } from "~/copy/emails/application-mail"
import { paymentConfirmedMailContent } from "~/copy/emails/payment-confirmed"
import { paymentLinkMailContent } from "~/copy/emails/payment-link"
import { paymentRefundMailContent } from "~/copy/emails/payment-refund"

// Every email's baseline copy, a valid E-mails singleton for tests that vary
// one email and need the rest of the document to parse.
export const baselineEmailTemplates = {
  application: applicationMailContent,
  paymentConfirmed: paymentConfirmedMailContent,
  paymentLink: paymentLinkMailContent,
  paymentRefund: paymentRefundMailContent,
}
