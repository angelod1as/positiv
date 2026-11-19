import type { LikertScale } from "~/business/cms/likert-scale.schema"
import { zod } from "~/lib/helpers/zod"
import type { LikertSubmissionInput } from "./likert-schema"

const POINTS = {
  strongly_disagree: 1,
  disagree: 2,
  depends: 3,
  agree: 4,
  strongly_agree: 5,
} as const

const answerSchema = zod.object({
  choice: zod.enum(Object.keys(POINTS) as [keyof typeof POINTS]),
  comment: zod.string().optional(),
})

// The text saved is the scale's, never the browser's: the history has to show
// what the person was actually asked. Answers that do not match the scale
// statement for statement mean it changed under the run, and are refused whole.
export function buildLikertSubmission(
  scale: LikertScale,
  answers: Record<string, unknown>,
): LikertSubmissionInput | null {
  if (Object.keys(answers).length !== scale.statements.length) return null

  const built: LikertSubmissionInput["answers"] = []
  for (const statement of scale.statements) {
    const parsed = answerSchema.safeParse(answers[statement.key])
    if (!parsed.success) return null

    built.push({
      statementKey: statement.key,
      statementText: statement.text,
      answer: POINTS[parsed.data.choice],
      comment: parsed.data.comment ?? null,
    })
  }

  return { beenTo: [], nonMonogamySince: null, answers: built }
}
