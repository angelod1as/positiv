import { getRulesFormQuestions } from "./rules-questions"
import type { EventType } from "~types/database/entities.types"

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const shuffleQuestions = (eventType: EventType) => {
  const rulesFormQuestions = getRulesFormQuestions(eventType)
  return shuffleArray(Object.entries(rulesFormQuestions)).map(
    ([name, question]) => {
      return {
        name,
        question: question.question,
        answers: shuffleArray([
          ...question.answers.correct,
          ...question.answers.incorrect,
        ]),
        correct: question.answers.correct,
      }
    },
  )
}
