import type { Answers, Question, ValidationResult } from "./question.types"

/**
 * A box nobody touched is a box nobody ticked. Left as undefined it would fail
 * the schema as missing, and the shared "required" copy would bury whatever the
 * question actually wanted to say about not being ticked.
 */
function asAnswered(question: Question, value: unknown): unknown {
  return question.input.kind === "boolean" ? value === true : value
}

/**
 * The whole run as each question's own rules read it, for a `refine` that has
 * to look at an answer other than its own. Without it a refine would see an
 * unticked box as undefined while the box's own question sees it as false.
 */
export function asAnsweredValues(
  questions: Iterable<Question>,
  answers: Answers,
): Answers {
  const values = { ...answers }

  for (const question of questions) {
    const answered = asAnswered(question, answers[question.id])

    // Only what normalising actually changed is written back, so a question
    // nobody has reached yet does not gain a key saying it was answered.
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
