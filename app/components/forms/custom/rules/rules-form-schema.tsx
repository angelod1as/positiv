import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { getRulesFormQuestions } from "./rules-questions"
import type { EventType } from "~types/database/entities.types"

export const getRulesFormSchema = (eventType: EventType) => {
  const rulesFormQuestions = getRulesFormQuestions(eventType)
  
  return Object.entries(rulesFormQuestions).reduce(
    (acc, [key, question]) => {
      if (question.answers.correct.length === 1) {
        // Single-select (radio button)
        acc[key] = zod
          .string()
          .min(1, { message: "Resposta obrigatória" })
          .refine((answer) => question.answers.correct.includes(answer), {
            message: "Você escolheu a resposta errada",
          })
      } else {
        // Multiple-select (checkbox)
        acc[key] = zod
          .array(zod.string())
          .min(1, { message: "Resposta obrigatória" })
          .refine(
            (answers) =>
              answers.some((answer) => question.answers.correct.includes(answer)),
            { message: "Nenhuma das respostas selecionadas está correta" },
          )
          .refine(
            (answers) => {
              const correctAnswers = question.answers.correct
              const selectedCorrect = answers.filter((a) =>
                correctAnswers.includes(a),
              )
              return selectedCorrect.length === correctAnswers.length
            },
            { message: "Você não selecionou todas as respostas corretas" },
          )
          .refine(
            (answers) => {
              const incorrectAnswers = answers.filter(
                (a) => !question.answers.correct.includes(a),
              )
              return incorrectAnswers.length === 0
            },
            { message: "Você selecionou uma ou mais respostas incorretas" },
          )
      }

      return acc
    },
    {} as Record<string, z.ZodTypeAny>,
  )
}
