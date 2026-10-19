import { registrationLimitAdminMailContent } from "~/copy/emails/registration-limit-admin"
import { renderInlineBlocks } from "./render-inline-portable-text"

export type RegistrationLimitAdminCopy = {
  subject: string
  heading: string
  bodyParagraphs: string[]
  cta: string
  closingParagraphs: string[]
}

export const registrationLimitAdminCopyFallback: RegistrationLimitAdminCopy = {
  subject: registrationLimitAdminMailContent.subject,
  heading: registrationLimitAdminMailContent.heading,
  bodyParagraphs: renderInlineBlocks(registrationLimitAdminMailContent.body),
  cta: registrationLimitAdminMailContent.cta,
  closingParagraphs: renderInlineBlocks(
    registrationLimitAdminMailContent.closing,
  ),
}
