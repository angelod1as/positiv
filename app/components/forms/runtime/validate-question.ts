import type { Answers, Question, ValidationResult } from "./question.types"

export function validateQuestion(
  question: Question,
  value: unknown,
  answers: Answers = {},
): ValidationResult {
  const result = question.schema.safeParse(value)

  if (!result.success) {
    return { ok: false, message: result.error.issues[0].message }
  }

  return question.refine?.(value, answers) ?? { ok: true }
}
