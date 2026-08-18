import { describe, expect, it } from "vitest"
import { getRulesFormQuestions } from "./rules-questions"

describe("getRulesFormQuestions", () => {
  it("should return the questions with the regular alcohol answer", () => {
    const questions = getRulesFormQuestions()
    
    expect(questions["not-a-club"].answers.correct[1]).toBe(
      "A frase está incorreta. É até possível que haja drinks ou cerveja, mas a moderação é essencial."
    )
  })

  it("should not mention BDSM in any answer", () => {
    const questions = getRulesFormQuestions()

    const allAnswers = Object.values(questions).flatMap((question) => [
      question.question,
      ...question.answers.correct,
      ...question.answers.incorrect,
    ])

    expect(allAnswers.some((answer) => /bdsm/i.test(answer))).toBe(false)
  })
})
