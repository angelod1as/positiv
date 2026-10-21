import { emailTemplatesCache } from "~/business/cms/email-templates-cache.server"
import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import type { ResolvedEmailTemplates } from "~/business/cms/email-templates-source.server"
import { emailLogger as logger } from "./email-logger.server"

export const EMAIL_COPY_TIMEOUT_MS = 2_000

export type EmailTemplatesCache = {
  get(): Promise<ResolvedEmailTemplates | null>
}

// An email's copy from the E-mails singleton, or its code fallback when the
// email is missing or invalid, Sanity fails, or it answers too slowly to hold
// a send.
export async function loadEmailCopy<Key extends keyof EmailTemplates, Copy>(
  name: string,
  key: Key,
  toCopy: (content: EmailTemplates[Key]) => Copy,
  fallback: Copy,
  cache: EmailTemplatesCache = emailTemplatesCache,
): Promise<Copy> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Sanity took over ${EMAIL_COPY_TIMEOUT_MS}ms`)),
      EMAIL_COPY_TIMEOUT_MS,
    )
  })

  try {
    const templates = await Promise.race([cache.get(), timeout])
    const content: EmailTemplates[Key] | undefined = templates?.[key]
    return content ? toCopy(content) : fallback
  } catch (error) {
    logger.error(`Could not load the ${name} email copy, using the default`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return fallback
  } finally {
    clearTimeout(timer)
  }
}
