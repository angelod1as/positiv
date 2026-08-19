import { ENV } from "varlock/env"
import type {
  InputSpec,
  Question,
} from "~/components/forms/runtime/question.types"
import { getRulesFormSchema } from "./rules-form-schema"
import { getRulesFormQuestions } from "./rules-questions"
import { shuffleArray } from "./shuffle-array"

type Answers = { correct: string[]; incorrect: string[] }

// An answer is its own value: the quiz has no ids for them, and the schemas
// that decide correctness compare the text itself.
const toOptions = ({ correct, incorrect }: Answers) =>
  shuffleArray([...correct, ...incorrect]).map((answer) => ({
    label: answer,
    value: answer,
  }))

const covers = (order: string[], ids: string[]) =>
  order.length === ids.length && ids.every((id) => order.includes(id))

function toInput(answers: Answers): InputSpec {
  const options = toOptions(answers)

  return answers.correct.length === 1
    ? { kind: "radio", options }
    : { kind: "checkbox", options }
}

/**
 * Shuffled on every call, questions and answers alike, so that nobody can learn
 * the quiz by position. Nothing downstream depends on the order: ids key the
 * schemas and the server's rejections.
 *
 * A run that has already started passes the order it was given the first time,
 * so that a refresh does not deal the quiz again underneath it. An order that
 * does not name today's questions exactly is from an older shape of the quiz
 * and is dropped for a fresh shuffle — no question may go missing over it.
 */
export function buildRulesQuestions(order?: string[]): Question[] {
  const schemas = getRulesFormSchema()
  const entries = Object.entries(getRulesFormQuestions())

  const byId = new Map(entries)

  const usable = !order || covers(order, entries.map(([id]) => id))

  if (!usable && ENV.NODE_ENV !== "production") {
    console.error(
      "[rules] the order this run was dealt does not name today's questions, so the quiz was dealt again.",
    )
  }

  const asked =
    order && usable
      ? order.flatMap((id) => {
          const question = byId.get(id)
          return question ? [[id, question] as const] : []
        })
      : shuffleArray(entries)

  return asked.map(
    ([id, question]) => ({
      id,
      prompt: question.question,
      input: toInput(question.answers),
      schema: schemas[id],
    }),
  )
}
