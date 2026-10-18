import { logger } from "~/lib/logger/logger.server"
import { zod } from "~/lib/helpers/zod"
import { type EmailTemplates, emailTemplatesSchema } from "./email-templates.schema"
import { createSanityClient } from "./sanity-client.server"

export const emailTemplatesQuery = `*[_id == "emailTemplates"][0]{
  paymentLink{ subject, heading, body }
}`

type EmailTemplatesClient = { fetch(query: string): Promise<unknown> }

export function resolveEmailTemplates(document: unknown): EmailTemplates | null {
  if (document === null || document === undefined) return null

  const result = emailTemplatesSchema.safeParse(document)
  if (!result.success) {
    // A broken email template must never take a send down: every email that
    // reads this already falls back to its code copy. Degrade to null and let
    // that fallback carry it. pnpm test:contract still catches bad published
    // content before a deploy.
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
