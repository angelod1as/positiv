import { logger } from "~/lib/logger/logger.server"
import { zod } from "~/lib/helpers/zod"
import { emailTemplatesQuery } from "./email-templates-query"
import { type EmailTemplates, emailTemplatesSchema } from "./email-templates.schema"
import { createSanityClient } from "./sanity-client.server"

type EmailTemplatesClient = { fetch(query: string): Promise<unknown> }

export function resolveEmailTemplates(document: unknown): EmailTemplates | null {
  if (document === null || document === undefined) return null

  const result = emailTemplatesSchema.safeParse(document)
  if (!result.success) {
    // Degrade to null so the send falls back to code copy; test:contract is the
    // guard that catches bad published content before a deploy.
    logger.error("Email templates failed validation, using the default copy", {
      error: zod.prettifyError(result.error),
    })
    return null
  }
  return result.data
}

export async function getEmailTemplates(
  client: EmailTemplatesClient = createSanityClient(),
): Promise<EmailTemplates | null> {
  return resolveEmailTemplates(await client.fetch(emailTemplatesQuery))
}
