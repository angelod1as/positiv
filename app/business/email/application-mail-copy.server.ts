import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { type ApplicationCopy, applicationCopyFallback } from "./application-mail-copy"
import { loadEmailCopy } from "./email-copy.server"
import { renderInlineBlocks } from "./render-inline-portable-text"

type EmailTemplatesCache = { get(): Promise<EmailTemplates | null> }

function toCopy(templates: EmailTemplates): ApplicationCopy {
  const { body, notes, ...lines } = templates.application
  return {
    ...lines,
    bodyParagraphs: renderInlineBlocks(body),
    notes: renderInlineBlocks(notes),
  }
}

export function loadApplicationCopy(
  cache?: EmailTemplatesCache,
): Promise<ApplicationCopy> {
  return loadEmailCopy("application", toCopy, applicationCopyFallback, cache)
}
