import type { z } from "zod"
import {
  renderInlineBlocks,
  unknownBlockVariables,
} from "~/business/email/render-inline-portable-text"
import { PAYMENT_LINK_MAIL_VARIABLES } from "~/business/email/payment-link-mail.variables"
import { zod } from "~/lib/helpers/zod"
import { portableTextSchema } from "./content.schema"
import { unknownVariables } from "./placeholders"

const within = (whitelist: readonly string[]) => ({
  error: "uses an unknown {{variable}} outside the documented set",
  check: (text: string) => unknownVariables(text, whitelist).length === 0,
})

const nonBlank = {
  error: "cannot be blank",
  check: (text: string) => text.trim().length > 0,
}

const lineSchema = (whitelist: readonly string[]) => {
  const variables = within(whitelist)
  return zod
    .string()
    .min(1)
    .refine(nonBlank.check, { error: nonBlank.error })
    .refine(variables.check, { error: variables.error })
}

const subjectSchema = (whitelist: readonly string[]) => {
  const variables = within(whitelist)
  return zod
    .string()
    .min(1)
    .max(150)
    .regex(/^[^\r\n]*$/, { error: "the subject cannot contain line breaks" })
    .refine(nonBlank.check, { error: nonBlank.error })
    .refine(variables.check, { error: variables.error })
}

const proseSchema = (field: string, whitelist: readonly string[]) =>
  portableTextSchema
    .refine(
      (blocks) => blocks.every((block) => (block.markDefs ?? []).length === 0),
      { error: `the ${field} cannot contain links` },
    )
    // At least one paragraph with text: empty blocks render to nothing.
    .refine((blocks) => renderInlineBlocks(blocks).length > 0, {
      error: `the ${field} needs at least one paragraph with text`,
    })
    // Validate the rendered text, so a token split across spans is caught here
    // rather than throwing at send time past the fallback.
    .refine((blocks) => unknownBlockVariables(blocks, whitelist).length === 0, {
      error: `the ${field} uses an unknown {{variable}} outside the documented set`,
    })

export const paymentLinkEmailSchema = zod.object({
  subject: subjectSchema(PAYMENT_LINK_MAIL_VARIABLES.subject),
  heading: lineSchema(PAYMENT_LINK_MAIL_VARIABLES.heading),
  body: proseSchema("body", PAYMENT_LINK_MAIL_VARIABLES.body),
})

export const emailTemplatesSchema = zod.object({
  paymentLink: paymentLinkEmailSchema,
})

export type EmailTemplates = z.output<typeof emailTemplatesSchema>
export type PaymentLinkEmailContent = z.output<typeof paymentLinkEmailSchema>
