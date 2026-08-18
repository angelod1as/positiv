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
 */
export function buildRulesQuestions(): Question[] {
  const schemas = getRulesFormSchema()

  return shuffleArray(Object.entries(getRulesFormQuestions())).map(
    ([id, question]) => ({
      id,
      prompt: question.question,
      input: toInput(question.answers),
      schema: schemas[id],
    }),
  )
}
