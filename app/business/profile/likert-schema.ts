import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"

const storableText = zod
  .string()
  .refine((text) => !text.includes("\u0000"))

const likertAnswerSchema = zod.object({
  statementKey: zod.string().trim().min(1).max(200),
  statementText: zod.string().min(1).max(2000),
  answer: zod.number().int().min(1).max(5),
  comment: storableText
    .max(5000)
    .nullish()
    .transform((comment) => comment?.trim() || null),
})

export const likertSubmissionSchema = zod.object({
  beenTo: zod.array(storableText.trim().min(1).max(200)).max(50),
  nonMonogamySince: zod
    .string()
    .regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/)
    .nullable(),
  answers: zod
    .array(likertAnswerSchema)
    .min(1)
    .max(200)
    .refine(
      (answers) =>
        new Set(answers.map(({ statementKey }) => statementKey)).size ===
        answers.length,
    ),
})

export type LikertSubmissionInput = z.input<typeof likertSubmissionSchema>
