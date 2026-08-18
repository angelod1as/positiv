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

describe("buildRulesQuestions input kind", () => {
  it("draws a question with a single right answer as a radio group", () => {
    const built = buildRulesQuestions("regular")

    const single = built.find((question) => question.id === "phone")

    expect(single?.input.kind).toBe("radio")
  })

  it("draws a question with several right answers as checkboxes", () => {
    const built = buildRulesQuestions("regular")

    const several = built.find((question) => question.id === "protection-2")

    expect(several?.input.kind).toBe("checkbox")
  })

  it("derives the kind from the quiz rather than from a list", () => {
    const quiz = getRulesFormQuestions("regular")
    const built = buildRulesQuestions("regular")

    for (const question of built) {
      const expected =
        quiz[question.id as keyof typeof quiz].answers.correct.length === 1
          ? "radio"
          : "checkbox"

      expect(question.input.kind).toBe(expected)
    }
  })

  it("offers every answer, right and wrong, as an option", () => {
    const quiz = getRulesFormQuestions("regular")
    const built = buildRulesQuestions("regular")

    const question = built.find((item) => item.id === "not-a-club")
    const { correct, incorrect } = quiz["not-a-club"].answers

    const options =
      question && "options" in question.input ? question.input.options : []

    expect(options.map((option) => option.value).sort()).toEqual(
      [...correct, ...incorrect].sort(),
    )
  })
})

const orderOf = (eventType: "regular") =>
  buildRulesQuestions(eventType)
    .map((question) => question.id)
    .join("|")

const optionOrderOf = (id: string) => {
  const question = buildRulesQuestions("regular").find(
    (item) => item.id === id,
  )

  return question && "options" in question.input
    ? question.input.options.map((option) => option.value).join("|")
    : ""
}

describe("buildRulesQuestions shuffling", () => {
  it("does not hand the questions back in the order they are written", () => {
    const orders = new Set(
      Array.from({ length: 10 }, () => orderOf("regular")),
    )

    expect(orders.size).toBeGreaterThan(1)
  })

  it("shuffles the options of a question too", () => {
    const orders = new Set(
      Array.from({ length: 10 }, () => optionOrderOf("not-a-club")),
    )

    expect(orders.size).toBeGreaterThan(1)
  })

  it("loses no question and no answer while shuffling", () => {
    const quiz = getRulesFormQuestions("regular")

    for (let attempt = 0; attempt < 10; attempt++) {
      const built = buildRulesQuestions("regular")

      expect(built.map((question) => question.id).sort()).toEqual(
        Object.keys(quiz).sort(),
      )

      for (const question of built) {
        const answers = quiz[question.id as keyof typeof quiz].answers
        const options =
          "options" in question.input ? question.input.options : []

        expect(options.map((option) => option.value).sort()).toEqual(
          [...answers.correct, ...answers.incorrect].sort(),
        )
      }
    }
  })
})
