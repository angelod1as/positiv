import { describe, expect, it } from "vitest"
import { buildLikertQuestions } from "./build-likert-questions"

const statements = [
  { key: "ciume", text: "Sinto ciúme e tudo bem." },
  { key: "consentimento", text: "Pergunto antes de tocar." },
]

describe("buildLikertQuestions", () => {
  it("asks one Likert question per statement, in the scale's order", () => {
    const questions = buildLikertQuestions(statements)

    expect(
      questions.map(({ id, prompt, input }) => ({ id, prompt, input })),
    ).toEqual([
      { id: "ciume", prompt: "Sinto ciúme e tudo bem.", input: { kind: "likert" } },
      {
        id: "consentimento",
        prompt: "Pergunto antes de tocar.",
        input: { kind: "likert" },
      },
    ])
  })

  it("requires a point on the scale and leaves the comment optional", () => {
    const [question] = buildLikertQuestions(statements)

    expect(question?.schema.safeParse(undefined).success).toBe(false)
    expect(question?.schema.safeParse({ choice: "agree" }).success).toBe(true)
    expect(
      question?.schema.safeParse({ choice: "agree", comment: "ok" }).success,
    ).toBe(true)
  })
})
