import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { duplicateKeys, LIKERT_KEY_PATTERN } from "./likert-key"

const statementSchema = zod.object({
  key: zod.string().regex(LIKERT_KEY_PATTERN),
  text: zod
    .string()
    .min(1)
    .refine((value) => value.trim().length > 0, { error: "cannot be blank" }),
})

export const likertScaleSchema = zod.object({
  statements: zod
    .array(statementSchema)
    .min(1)
    .superRefine((statements, context) => {
      const repeated = duplicateKeys(statements.map(({ key }) => key))
      if (repeated.length > 0) {
        context.addIssue({
          code: "custom",
          message: `statements share a key: ${repeated.join(", ")}`,
        })
      }
    }),
})

export type LikertScale = z.output<typeof likertScaleSchema>
