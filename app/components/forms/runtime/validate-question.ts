import type { Question, ValidationResult } from "./question.types"

export function validateQuestion(
  question: Question,
  value: unknown,
): ValidationResult {
  const result = question.schema.safeParse(value)

  if (result.success) {
    return { ok: true }
  }

  return { ok: false, message: result.error.issues[0].message }
}
