import { zod } from "~/lib/helpers/zod"
import { likertCopy } from "~/copy/forms"

export const LIKERT_CHOICES = [
  "strongly_disagree",
  "disagree",
  "depends",
  "agree",
  "strongly_agree",
] as const

export type LikertChoice = (typeof LIKERT_CHOICES)[number]

export type LikertAnswer = { choice: LikertChoice; comment?: string }

export const likertSchema = zod.object(
  {
    choice: zod.enum(LIKERT_CHOICES, { message: likertCopy.choiceRequired }),
    comment: zod.string().max(5000, likertCopy.commentTooLong).optional(),
  },
  { message: likertCopy.choiceRequired },
)
