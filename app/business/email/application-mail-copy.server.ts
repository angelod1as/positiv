import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { type ApplicationCopy, applicationCopyFallback } from "./application-mail-copy"
import { type EmailTemplatesCache, loadEmailCopy } from "./email-copy.server"
import { renderInlineBlocks } from "./render-inline-portable-text"

function toCopy(content: EmailTemplates["application"]): ApplicationCopy {
  const { body, notes, ...lines } = content
  return {
    ...lines,
    bodyParagraphs: renderInlineBlocks(body),
    notes: renderInlineBlocks(notes),
  }
}

export function loadApplicationCopy(
  cache?: EmailTemplatesCache,
): Promise<ApplicationCopy> {
  return loadEmailCopy("application", "application", toCopy, applicationCopyFallback, cache)
}
