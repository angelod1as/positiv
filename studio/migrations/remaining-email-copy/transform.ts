import { applicationMailContent } from "../../../app/copy/emails/application-mail"
import { paymentConfirmedMailContent } from "../../../app/copy/emails/payment-confirmed"
import { paymentRefundMailContent } from "../../../app/copy/emails/payment-refund"
import { registrationLimitAdminMailContent } from "../../../app/copy/emails/registration-limit-admin"
import { EMAIL_TEMPLATES_ID } from "../../singletons"

// The four emails whose copy moves into the E-mails singleton, with the same
// baseline copy the app falls back to. The payment link is already there.
export const emailCopy = {
  application: applicationMailContent,
  paymentConfirmed: paymentConfirmedMailContent,
  paymentRefund: paymentRefundMailContent,
  registrationLimit: registrationLimitAdminMailContent,
}

export const singletonBase = {
  _id: EMAIL_TEMPLATES_ID,
  _type: "emailTemplates",
}

// Every "email.field" path the singleton does not have a value for yet.
export function missingFields(document: Record<string, unknown> | null) {
  return Object.entries(emailCopy).flatMap(([email, content]) => {
    const current = (document?.[email] ?? {}) as Record<string, unknown>
    return Object.keys(content)
      .filter((field) => current[field] === undefined)
      .map((field) => `${email}.${field}`)
  })
}

// One setIfMissing per email object and then per field, in that order, so the
// parent exists before its fields are set and a field an Editor already set is
// never overwritten.
export function fillPatches(): Record<string, unknown>[] {
  return Object.entries(emailCopy).flatMap(([email, content]) => [
    { [email]: {} },
    ...Object.entries(content).map(([field, value]) => ({
      [`${email}.${field}`]: value,
    })),
  ])
}
