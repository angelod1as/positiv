import { describe, expect, it } from "vitest"
import { buildRulesQuestions } from "./build-rules-questions"
import { getRulesFormQuestions } from "./rules-questions"

describe("buildRulesQuestions", () => {
  it("returns one question per entry of the quiz", () => {
    const built = buildRulesQuestions("regular")

    expect(built).toHaveLength(
      Object.keys(getRulesFormQuestions("regular")).length,
    )
  })

  it("keeps the quiz keys as question ids", () => {
    const built = buildRulesQuestions("regular")

    expect(built.map((question) => question.id).sort()).toEqual(
      Object.keys(getRulesFormQuestions("regular")).sort(),
    )
  })

  it("carries the question text as the prompt", () => {
    const quiz = getRulesFormQuestions("bdsm")
    const built = buildRulesQuestions("bdsm")

    const phone = built.find((question) => question.id === "phone")

    expect(phone?.prompt).toBe(quiz.phone.question)
  })
})
