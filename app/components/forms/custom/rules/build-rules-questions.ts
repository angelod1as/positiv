import { ENV } from "varlock/env"
import type {
  InputSpec,
  Question,
} from "~/components/forms/runtime/question.types"
import { getRulesFormSchema } from "./rules-form-schema"
import { getRulesFormQuestions } from "./rules-questions"
import { shuffleArray } from "./shuffle-array"

type Answers = { correct: string[]; incorrect: string[] }

/**
 * How a run was dealt: the questions in the order they are asked, and the
 * answers of each in the order they are laid out.
 */
export type RulesDeal = {
  questions: string[]
  options: Record<string, string[]>
}

// Equal lengths and every entry present is enough to know the order is an exact
// permutation: a duplicate or a stray entry would have to push a real one out,
// and then the membership check fails.
const covers = (order: string[], all: string[]) =>
  order.length === all.length && all.every((entry) => order.includes(entry))

// An answer is its own value: the quiz has no ids for them, and the schemas
// that decide correctness compare the text itself.
const toOptions = ({ correct, incorrect }: Answers, dealt?: string[]) => {
  const answers = [...correct, ...incorrect]

  const laid = dealt && covers(dealt, answers) ? dealt : shuffleArray(answers)

  return laid.map((answer) => ({ label: answer, value: answer }))
}

function toInput(answers: Answers, dealt?: string[]): InputSpec {
  const options = toOptions(answers, dealt)

  return answers.correct.length === 1
    ? { kind: "radio", options }
    : { kind: "checkbox", options }
}

/** The deal a set of built questions represents, ready to be written down. */
export function dealOf(questions: Question[]): RulesDeal {
  return {
    questions: questions.map((question) => question.id),
    options: Object.fromEntries(
      questions.flatMap((question) =>
        "options" in question.input
          ? [[question.id, question.input.options.map((option) => option.value)]]
          : [],
      ),
    ),
  }
}

/**
 * Shuffled on every call, questions and answers alike, so that nobody can learn
 * the quiz by position. Nothing downstream depends on the order: ids key the
 * schemas and the server's rejections.
 *
 * A run that has already started passes the deal it was given the first time,
 * so that a refresh does not lay the quiz out again underneath it — neither the
 * questions nor the answers within them. A deal that does not name today's
 * questions exactly is from an older shape of the quiz and is dropped for a
 * fresh shuffle; the same goes, question by question, for its answers.
 */
export function buildRulesQuestions(deal?: RulesDeal): Question[] {
  const schemas = getRulesFormSchema()
  const entries = Object.entries(getRulesFormQuestions())

  const byId = new Map(entries)

  const usable =
    !deal ||
    covers(
      deal.questions,
      entries.map(([id]) => id),
    )

  if (!usable && ENV.NODE_ENV !== "production") {
    console.error(
      "[rules] the order this run was dealt does not name today's questions, so the quiz was dealt again.",
    )
  }

  const asked =
    deal && usable
      ? deal.questions.flatMap((id) => {
          const question = byId.get(id)
          return question ? [[id, question] as const] : []
        })
      : shuffleArray(entries)

  return asked.map(([id, question]) => ({
    id,
    prompt: question.question,
    input: toInput(question.answers, usable ? deal?.options[id] : undefined),
    schema: schemas[id],
  }))
}
