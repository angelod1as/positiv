import { getRulesFormQuestions } from "./rules-questions"

/**
 * The answers a correct run of the quiz would produce, in the shape each
 * question's control writes: a string for a single choice, every right option
 * for a multiple one.
 */
export function buildCorrectRulesAnswers(): Record<string, string | string[]> {
  return Object.fromEntries(
    Object.entries(getRulesFormQuestions()).map(([id, question]) => [
      id,
      question.answers.correct.length === 1
        ? question.answers.correct[0]
        : question.answers.correct,
    ]),
  )
}
