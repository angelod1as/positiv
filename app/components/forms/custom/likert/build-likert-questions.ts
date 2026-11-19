import { likertSchema } from "~/components/forms/runtime/likert"
import type { Question } from "~/components/forms/runtime/question.types"

type Statement = { key: string; text: string }

export function buildLikertQuestions(statements: Statement[]): Question[] {
  return statements.map((statement) => ({
    id: statement.key,
    prompt: statement.text,
    input: { kind: "likert" },
    schema: likertSchema,
  }))
}
