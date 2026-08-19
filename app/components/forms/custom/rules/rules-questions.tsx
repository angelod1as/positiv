import { rulesQuestionsCopy } from "~/copy/events"

type RulesFormQuestion = {
  question: string
  answers: {
    correct: string[]
    incorrect: string[]
  }
}

export const getRulesFormQuestions = (): Record<
  keyof typeof rulesQuestionsCopy,
  RulesFormQuestion
> => {
  const entries = Object.entries(rulesQuestionsCopy).map(
    ([name, { question, answers }]): [string, RulesFormQuestion] => [
      name,
      {
        question,
        answers: {
          correct: Object.values(answers.correct),
          incorrect: Object.values(answers.incorrect),
        },
      },
    ],
  )

  return Object.fromEntries(entries) as Record<
    keyof typeof rulesQuestionsCopy,
    RulesFormQuestion
  >
}
