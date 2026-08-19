import type { Answers, Question, ValidationResult } from "./question.types"

/**
 * A box nobody touched is a box nobody ticked. Left as undefined it would fail
 * the schema as missing, and the shared "required" copy would bury whatever the
 * question actually wanted to say about not being ticked.
 */
function asAnswered(question: Question, value: unknown): unknown {
  return question.input.kind === "boolean" ? value === true : value
}

export function validateQuestion(
  question: Question,
  value: unknown,
  answers: Answers = {},
): ValidationResult {
  const answered = asAnswered(question, value)
  const result = question.schema.safeParse(answered)

  if (!result.success) {
    return { ok: false, message: result.error.issues[0].message }
  }

  return question.refine?.(answered, answers) ?? { ok: true }
}
