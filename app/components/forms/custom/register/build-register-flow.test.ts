import { describe, expect, it, vi } from "vitest"
import { buildRegisterFlow } from "./build-register-flow"
import { buildRegisterQuestions } from "./build-register-questions"

const context = { firstTryCorrect: {}, data: {} }

describe("buildRegisterFlow", () => {
  it("puts every question on one screen", () => {
    const questions = buildRegisterQuestions()
    const flow = buildRegisterFlow(questions, vi.fn())

    expect(flow.steps[flow.start]).toEqual({
      kind: "screen",
      ids: questions.map((question) => question.id),
    })
  })

  it("goes from the screen to the commit, and then it is done", () => {
    const commit = vi.fn()
    const flow = buildRegisterFlow(buildRegisterQuestions(), commit)

    const afterScreen = flow.next(flow.start, {}, context)
    expect(flow.steps[afterScreen]).toEqual({ kind: "commit", run: commit })

    expect(flow.next(afterScreen, {}, context)).toBe("done")
  })

  it("has no step between the screen and the save", () => {
    const flow = buildRegisterFlow(buildRegisterQuestions(), vi.fn())

    expect(Object.keys(flow.steps)).toHaveLength(2)
  })
})
