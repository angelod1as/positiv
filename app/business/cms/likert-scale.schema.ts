import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { duplicateKeys, LIKERT_KEY_PATTERN } from "./likert-key"

const text = zod
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, { error: "cannot be blank" })

const key = zod.string().regex(LIKERT_KEY_PATTERN)

const uniqueKeys =
  (what: string) => (keys: string[], context: z.RefinementCtx) => {
    const repeated = duplicateKeys(keys)
    if (repeated.length > 0) {
      context.addIssue({
        code: "custom",
        message: `${what} share a key: ${repeated.join(", ")}`,
      })
    }
  }

const statementSchema = zod.object({ key, text })

const themeSchema = zod.object({
  name: text,
  statements: zod.array(statementSchema).min(1),
})

const optionSchema = zod.object({ key, label: text })

export const likertScaleSchema = zod.object({
  themes: zod
    .array(themeSchema)
    .min(1)
    .superRefine((themes, context) =>
      uniqueKeys("statements")(
        themes.flatMap((theme) => theme.statements.map(({ key }) => key)),
        context,
      ),
    ),
  venues: zod.object({
    question: text,
    options: zod
      .array(optionSchema)
      .min(1)
      .superRefine((options, context) =>
        uniqueKeys("venue options")(
          options.map(({ key }) => key),
          context,
        ),
      ),
  }),
  nonMonogamySince: zod.object({
    question: text,
    notLivingLabel: text,
  }),
})

export type LikertScale = z.output<typeof likertScaleSchema>
