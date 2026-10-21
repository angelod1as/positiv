import { logger } from "~/lib/logger/logger.server"
import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { emailTemplatesQuery } from "./email-templates-query"
import {
  applicationEmailSchema,
  type EmailTemplates,
  paymentConfirmedEmailSchema,
  paymentLinkEmailSchema,
  paymentRefundEmailSchema,
} from "./email-templates.schema"
import { createSanityClient } from "./sanity-client.server"

type EmailTemplatesClient = { fetch(query: string): Promise<unknown> }

// Each email is parsed on its own, so one invalid or missing email falls back
// to its code copy without taking the other emails' copy down with it.
function parseEmail<Schema extends z.ZodType>(
  name: keyof EmailTemplates,
  schema: Schema,
  content: unknown,
): z.output<Schema> | undefined {
  const result = schema.safeParse(content)
  if (result.success) return result.data
  logger.error(`The ${name} email copy failed validation, using the default`, {
    error: zod.prettifyError(result.error),
  })
  return undefined
}

export type ResolvedEmailTemplates = Partial<EmailTemplates>

export function resolveEmailTemplates(
  document: unknown,
): ResolvedEmailTemplates | null {
  if (document === null || document === undefined) return null
  if (typeof document !== "object") {
    logger.error("Email templates failed validation, using the default copy", {
      error: `Expected an object, got ${typeof document}`,
    })
    return null
  }

  const emails = document as Record<string, unknown>
  return {
    application: parseEmail("application", applicationEmailSchema, emails.application),
    paymentConfirmed: parseEmail(
      "paymentConfirmed",
      paymentConfirmedEmailSchema,
      emails.paymentConfirmed,
    ),
    paymentLink: parseEmail("paymentLink", paymentLinkEmailSchema, emails.paymentLink),
    paymentRefund: parseEmail("paymentRefund", paymentRefundEmailSchema, emails.paymentRefund),
  }
}

export async function getEmailTemplates(
  client: EmailTemplatesClient = createSanityClient(),
): Promise<ResolvedEmailTemplates | null> {
  return resolveEmailTemplates(await client.fetch(emailTemplatesQuery))
}
