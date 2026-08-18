import type {
  InputSpec,
  Question,
} from "~/components/forms/runtime/question.types"
import { zod } from "~/lib/helpers/zod"
import type { EventType } from "~types/database/entities.types"
import { getRulesFormQuestions } from "./rules-questions"

type Answers = { correct: string[]; incorrect: string[] }

// An answer is its own value: the quiz has no ids for them, and the schemas
// that decide correctness compare the text itself.
const toOptions = ({ correct, incorrect }: Answers) =>
  [...correct, ...incorrect].map((answer) => ({
    label: answer,
    value: answer,
  }))

function toInput(answers: Answers): InputSpec {
  const options = toOptions(answers)

  return answers.correct.length === 1
    ? { kind: "radio", options }
    : { kind: "checkbox", options }
}

export function buildRulesQuestions(eventType: EventType): Question[] {
  return Object.entries(getRulesFormQuestions(eventType)).map(
    ([id, question]) => ({
      id,
      prompt: question.question,
      input: toInput(question.answers),
      schema: zod.string(),
    }),
  )
}
