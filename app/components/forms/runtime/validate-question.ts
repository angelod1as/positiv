import type { Answers, Question, ValidationResult } from "./question.types"

/**
 * A box nobody touched is a box nobody ticked. Left undefined it fails the
 * schema as missing, and the shared "required" copy buries what the question
 * wanted to say.
 */
function asAnswered(question: Question, value: unknown): unknown {
  return question.input.kind === "boolean" ? value === true : value
}

/**
 * The run as each question's own rules read it, for a `refine` looking at
 * someone else's answer: an unticked box is false there, not undefined.
 */
export function asAnsweredValues(
  questions: Iterable<Question>,
  answers: Answers,
): Answers {
  const values = { ...answers }

  for (const question of questions) {
    const answered = asAnswered(question, answers[question.id])

    // Only what normalising changed is written back, so a question nobody
    // reached gains no key saying it was answered.
    if (answered !== answers[question.id]) values[question.id] = answered
  }

  return values
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
