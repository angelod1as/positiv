import { paymentLinkMailContent } from "../../../app/copy/emails/payment-link"
import { EMAIL_TEMPLATES_ID } from "../../singletons"

export type EmailTemplatesDocument = {
  _id: string
  _type: "emailTemplates"
  paymentLink: typeof paymentLinkMailContent
}

// The E-mails singleton seeded with the payment-link email's baseline copy, the
// same copy the app falls back to. createOrReplace makes the write idempotent:
// run it twice and the document is what one run left. It therefore runs once
// per dataset — re-running after Editors have changed the copy erases it.
export function emailTemplatesDocument(): EmailTemplatesDocument {
  return {
    _id: EMAIL_TEMPLATES_ID,
    _type: "emailTemplates",
    paymentLink: paymentLinkMailContent,
  }
}
