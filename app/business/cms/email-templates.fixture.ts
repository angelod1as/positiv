import { applicationMailContent } from "~/copy/emails/application-mail"
import { paymentLinkMailContent } from "~/copy/emails/payment-link"

// Every email's baseline copy, a valid E-mails singleton for tests that vary
// one email and need the rest of the document to parse.
export const baselineEmailTemplates = {
  application: applicationMailContent,
  paymentLink: paymentLinkMailContent,
}
