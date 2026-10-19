import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { loadEmailCopy } from "./email-copy.server"
import {
  type RegistrationLimitAdminCopy,
  registrationLimitAdminCopyFallback,
} from "./registration-limit-admin-mail-copy"
import { renderInlineBlocks } from "./render-inline-portable-text"

type EmailTemplatesCache = { get(): Promise<EmailTemplates | null> }

function toCopy(templates: EmailTemplates): RegistrationLimitAdminCopy {
  const { subject, heading, body, cta, closing } = templates.registrationLimit
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
    toCopy,
    registrationLimitAdminCopyFallback,
    cache,
  )
}
