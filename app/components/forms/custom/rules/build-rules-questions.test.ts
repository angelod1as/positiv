import { describe, expect, it, vi } from "vitest"
import { validationMessages } from "~/lib/helpers/validation-messages"
import { buildRulesQuestions } from "./build-rules-questions"
import { getRulesFormQuestions } from "./rules-questions"

describe("buildRulesQuestions", () => {
  it("returns one question per entry of the quiz", () => {
    const built = buildRulesQuestions()

    expect(built).toHaveLength(
      Object.keys(getRulesFormQuestions()).length,
    )
  })

  it("keeps the quiz keys as question ids", () => {
    const built = buildRulesQuestions()

    expect(built.map((question) => question.id).sort()).toEqual(
      Object.keys(getRulesFormQuestions()).sort(),
    )
  })

  it("carries the question text as the prompt", () => {
    const quiz = getRulesFormQuestions()
    const built = buildRulesQuestions()

    const phone = built.find((question) => question.id === "phone")

    expect(phone?.prompt).toBe(quiz.phone.question)
  })
})

describe("buildRulesQuestions input kind", () => {
  it("draws a question with a single right answer as a radio group", () => {
    const built = buildRulesQuestions()

    const single = built.find((question) => question.id === "phone")

    expect(single?.input.kind).toBe("radio")
  })

  it("draws a question with several right answers as checkboxes", () => {
    const built = buildRulesQuestions()

    const several = built.find((question) => question.id === "protection-2")

    expect(several?.input.kind).toBe("checkbox")
  })

  it("derives the kind from the quiz rather than from a list", () => {
    const quiz = getRulesFormQuestions()
    const built = buildRulesQuestions()

    for (const question of built) {
      const expected =
        quiz[question.id as keyof typeof quiz].answers.correct.length === 1
          ? "radio"
          : "checkbox"

      expect(question.input.kind).toBe(expected)
    }
  })

  it("offers every answer, right and wrong, as an option", () => {
    const quiz = getRulesFormQuestions()
    const built = buildRulesQuestions()

    const question = built.find((item) => item.id === "not-a-club")
    const { correct, incorrect } = quiz["not-a-club"].answers

    const options =
      question && "options" in question.input ? question.input.options : []

    expect(options.map((option) => option.value).sort()).toEqual(
      [...correct, ...incorrect].sort(),
    )
  })
})

const orderOf = () =>
  buildRulesQuestions()
    .map((question) => question.id)
    .join("|")

const optionOrderOf = (id: string) => {
  const question = buildRulesQuestions().find(
    (item) => item.id === id,
  )

  return question && "options" in question.input
    ? question.input.options.map((option) => option.value).join("|")
    : ""
}

describe("buildRulesQuestions shuffling", () => {
  it("does not hand the questions back in the order they are written", () => {
    const orders = new Set(
      Array.from({ length: 10 }, () => orderOf()),
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
    const quiz = getRulesFormQuestions()

    for (let attempt = 0; attempt < 10; attempt++) {
      const built = buildRulesQuestions()

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

const questionById = (id: string) =>
  buildRulesQuestions().find((question) => question.id === id)

const messageFor = (id: string, value: unknown) => {
  const result = questionById(id)?.schema.safeParse(value)

  return result?.success ? null : result?.error.issues[0].message
}

describe("buildRulesQuestions schemas", () => {
  it("accepts the right answer of a single-answer question", () => {
    const quiz = getRulesFormQuestions()

    expect(messageFor("phone", quiz.phone.answers.correct[0])).toBeNull()
  })

  it("turns down a wrong answer with the message the quiz already had", () => {
    const quiz = getRulesFormQuestions()

    expect(messageFor("phone", quiz.phone.answers.incorrect[0])).toBe(
      "Você escolheu a resposta errada",
    )
  })

  it("turns down an unanswered question with the standard required message", () => {
    expect(messageFor("phone", undefined)).toBe(validationMessages.required)
  })

  it("accepts every right answer of a multi-answer question", () => {
    const quiz = getRulesFormQuestions()

    expect(
      messageFor("protection-2", quiz["protection-2"].answers.correct),
    ).toBeNull()
  })

  it("turns down a partial answer to a multi-answer question", () => {
    const quiz = getRulesFormQuestions()

    expect(
      messageFor("protection-2", [quiz["protection-2"].answers.correct[0]]),
    ).toBe("Você não selecionou todas as respostas corretas")
  })

  it("turns down a right answer spoiled by a wrong one", () => {
    const quiz = getRulesFormQuestions()
    const { correct, incorrect } = quiz["protection-2"].answers

    expect(messageFor("protection-2", [...correct, incorrect[0]])).toBe(
      "Você selecionou uma ou mais respostas incorretas",
    )
  })
})

const deal = (questions: string[]) => ({ questions, options: {} })

describe("buildRulesQuestions with a given order", () => {
  it("asks the questions in the order it was given", () => {
    const order = Object.keys(getRulesFormQuestions())

    expect(buildRulesQuestions(deal(order)).map((question) => question.id)).toEqual(
      order,
    )
  })

  it("keeps giving the same order back, where a shuffle would not", () => {
    const order = Object.keys(getRulesFormQuestions())

    expect(buildRulesQuestions(deal(order)).map((question) => question.id)).toEqual(
      buildRulesQuestions(deal(order)).map((question) => question.id),
    )
  })

  // An order written down by an older shape of the quiz cannot be trusted to
  // place today's questions, but no question may go missing over it.
  it("ignores an order that does not name every question", () => {
    const order = Object.keys(getRulesFormQuestions()).slice(0, 3)

    expect(buildRulesQuestions(deal(order)).map((question) => question.id).sort()).toEqual(
      Object.keys(getRulesFormQuestions()).sort(),
    )
  })

  it("says so when it drops an order, which is otherwise silent", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    buildRulesQuestions(deal(Object.keys(getRulesFormQuestions()).slice(0, 3)))

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("[rules]"),
    )

    consoleError.mockRestore()
  })

  it("stays quiet about an order it can use", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    buildRulesQuestions(deal(Object.keys(getRulesFormQuestions())))

    expect(consoleError).not.toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it("ignores an order naming a question the quiz no longer has", () => {
    const order = [...Object.keys(getRulesFormQuestions()), "long-gone"]

    expect(buildRulesQuestions(deal(order)).map((question) => question.id).sort()).toEqual(
      Object.keys(getRulesFormQuestions()).sort(),
    )
  })

  // Reusing the part of a stale order that still fits would keep most of the
  // run in place, which reads as the order having been honoured. It is dealt
  // again instead, whole.
  it("deals the whole quiz again rather than keeping the part that still fits", () => {
    const stale = [...Object.keys(getRulesFormQuestions())].reverse()
    const withGhost = [...stale.slice(0, -1), "long-gone"]

    const dealt = buildRulesQuestions(deal(withGhost)).map((question) => question.id)

    expect(dealt.slice(0, stale.length - 1)).not.toEqual(stale.slice(0, -1))
  })
})

describe("buildRulesQuestions with the answers a run was dealt", () => {
  const ids = () => Object.keys(getRulesFormQuestions())

  const answersOf = (id: string) => {
    const { answers } = getRulesFormQuestions()[id as keyof ReturnType<typeof getRulesFormQuestions>]
    return [...answers.correct, ...answers.incorrect]
  }

  const optionsOf = (questions: ReturnType<typeof buildRulesQuestions>, id: string) => {
    const input = questions.find((question) => question.id === id)?.input
    return "options" in (input ?? {})
      ? (input as { options: { value: string }[] }).options.map(
          (option) => option.value,
        )
      : []
  }

  it("lays the answers out in the order it was given", () => {
    const id = ids()[0]
    const dealt = [...answersOf(id)].sort()

    const built = buildRulesQuestions({
      questions: ids(),
      options: { [id]: dealt },
    })

    expect(optionsOf(built, id)).toEqual(dealt)
  })

  it("shuffles the answers it was told nothing about", () => {
    const id = ids()[0]

    const built = buildRulesQuestions({ questions: ids(), options: {} })

    expect(optionsOf(built, id).sort()).toEqual([...answersOf(id)].sort())
  })

  it("ignores an answer order that does not name every answer", () => {
    const id = ids()[0]
    const dealt = [...answersOf(id)].sort().slice(0, 2)

    const built = buildRulesQuestions({
      questions: ids(),
      options: { [id]: dealt },
    })

    expect(optionsOf(built, id).sort()).toEqual([...answersOf(id)].sort())
  })
})
