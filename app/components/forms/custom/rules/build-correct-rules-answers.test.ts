import { describe, expect, it } from "vitest"
import { buildCorrectRulesAnswers } from "./build-correct-rules-answers"
import { getRulesFormSchema } from "./rules-form-schema"
import { getRulesFormQuestions } from "./rules-questions"

describe("buildCorrectRulesAnswers", () => {
  it("answers every question the quiz asks", () => {
    expect(Object.keys(buildCorrectRulesAnswers()).sort()).toEqual(
      Object.keys(getRulesFormQuestions()).sort(),
    )
  })

  it("answers a single-choice question with the one right answer", () => {
    const answers = buildCorrectRulesAnswers()

    const single = Object.entries(getRulesFormQuestions()).find(
      ([, question]) => question.answers.correct.length === 1,
    )
    if (!single) throw new Error("the quiz asks no single-choice question")

    const [id, question] = single

    expect(answers[id]).toBe(question.answers.correct[0])
  })

  it("answers a multiple-choice question with all of the right ones", () => {
    const answers = buildCorrectRulesAnswers()

    const multiple = Object.entries(getRulesFormQuestions()).find(
      ([, question]) => question.answers.correct.length > 1,
    )
    if (!multiple) throw new Error("the quiz asks no multiple-choice question")

    const [id, question] = multiple

    expect(answers[id]).toEqual(question.answers.correct)
  })

  it("passes the very schemas the server checks the answers against", () => {
    const answers = buildCorrectRulesAnswers()

    for (const [id, schema] of Object.entries(getRulesFormSchema())) {
      expect(schema.safeParse(answers[id]).success).toBe(true)
    }
  })
})
