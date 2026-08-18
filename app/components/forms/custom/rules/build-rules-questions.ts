import type { Question } from "~/components/forms/runtime/question.types"
import { zod } from "~/lib/helpers/zod"
import type { EventType } from "~types/database/entities.types"
import { getRulesFormQuestions } from "./rules-questions"

export function buildRulesQuestions(eventType: EventType): Question[] {
  return Object.entries(getRulesFormQuestions(eventType)).map(
    ([id, question]) => ({
      id,
      prompt: question.question,
      input: {
        kind: "radio",
        options: [
          ...question.answers.correct,
          ...question.answers.incorrect,
        ].map((answer) => ({ label: answer, value: answer })),
      },
      schema: zod.string(),
    }),
  )
}
