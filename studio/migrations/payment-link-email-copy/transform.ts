import { paymentLinkMailContent } from "../../../app/copy/emails/payment-link"
import { EMAIL_TEMPLATES_ID } from "../../singletons"

export type EmailTemplatesDocument = {
  _id: string
  _type: "emailTemplates"
  paymentLink: typeof paymentLinkMailContent
}

// The E-mails singleton seeded with the payment-link email's baseline copy, the
// same copy the app falls back to. Written with createIfNotExists, so re-running
// is a no-op once the singleton exists and never overwrites an Editor's changes.
export function emailTemplatesDocument(): EmailTemplatesDocument {
  return {
    _id: EMAIL_TEMPLATES_ID,
    _type: "emailTemplates",
    paymentLink: paymentLinkMailContent,
  }
}
