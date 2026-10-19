import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { type EmailTemplatesCache, loadEmailCopy } from "./email-copy.server"
import {
  type RegistrationLimitAdminCopy,
  registrationLimitAdminCopyFallback,
} from "./registration-limit-admin-mail-copy"
import { renderInlineBlocks } from "./render-inline-portable-text"

function toCopy(content: EmailTemplates["registrationLimit"]): RegistrationLimitAdminCopy {
  const { subject, heading, body, cta, closing } = content
  return {
    subject,
    heading,
    bodyParagraphs: renderInlineBlocks(body),
    cta,
    closingParagraphs: renderInlineBlocks(closing),
  }
}

export function loadRegistrationLimitAdminCopy(
  cache?: EmailTemplatesCache,
): Promise<RegistrationLimitAdminCopy> {
  return loadEmailCopy(
    "registration limit",
    "registrationLimit",
    toCopy,
    registrationLimitAdminCopyFallback,
    cache,
  )
}
