import type { z } from "zod"
import { unknownBlockVariables } from "~/business/email/render-inline-portable-text"
import { PAYMENT_LINK_MAIL_VARIABLES } from "~/business/email/payment-link-mail.variables"
import { zod } from "~/lib/helpers/zod"
import { portableTextSchema } from "./content.schema"
import { unknownVariables } from "./placeholders"

const within = (whitelist: readonly string[]) => ({
  error: "uses an unknown {{variable}} outside the documented set",
  check: (text: string) => unknownVariables(text, whitelist).length === 0,
})

const subject = within(PAYMENT_LINK_MAIL_VARIABLES.subject)
const heading = within(PAYMENT_LINK_MAIL_VARIABLES.heading)
const bodyVariables = PAYMENT_LINK_MAIL_VARIABLES.body

export const paymentLinkEmailSchema = zod.object({
  subject: zod.string().refine(subject.check, { error: subject.error }),
  heading: zod.string().refine(heading.check, { error: heading.error }),
  body: portableTextSchema
    .refine(
      (blocks) => blocks.every((block) => (block.markDefs ?? []).length === 0),
      { error: "the body cannot contain links" },
    )
    // Validate the rendered text, so a token split across spans is caught here
    // rather than throwing at send time past the fallback.
    .refine(
      (blocks) => unknownBlockVariables(blocks, bodyVariables).length === 0,
      {
        error:
          "the body uses an unknown {{variable}} outside the documented set",
      },
    ),
})

export const emailTemplatesSchema = zod.object({
  paymentLink: paymentLinkEmailSchema,
})

export type EmailTemplates = z.output<typeof emailTemplatesSchema>
export type PaymentLinkEmailContent = z.output<typeof paymentLinkEmailSchema>
