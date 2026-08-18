import { getRulesFormQuestions } from "./rules-questions"
import { shuffleArray } from "./shuffle-array"

export const shuffleQuestions = () => {
  const rulesFormQuestions = getRulesFormQuestions()
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
