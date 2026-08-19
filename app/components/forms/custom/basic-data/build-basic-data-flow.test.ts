import { describe, expect, it, vi } from "vitest"
import { buildBasicDataQuestions } from "./build-basic-data-questions"
import { buildBasicDataFlow } from "./build-basic-data-flow"

const commit = vi.fn(() => ({ ok: true as const }))
const questions = buildBasicDataQuestions()

describe("buildBasicDataFlow", () => {
  it("asks everything on one screen", () => {
    const flow = buildBasicDataFlow(questions, commit)
    const start = flow.steps[flow.start]

    expect(start).toEqual({
      kind: "screen",
      ids: questions.map((question) => question.id),
    })
  })

  it("saves once the screen is answered, and then is done", () => {
    const flow = buildBasicDataFlow(questions, commit)

    const afterScreen = flow.next(flow.start, {}, {
      firstTryCorrect: {},
      data: {},
    })
    expect(flow.steps[afterScreen]).toEqual({ kind: "commit", run: commit })

    expect(flow.next(afterScreen, {}, { firstTryCorrect: {}, data: {} })).toBe(
      "done",
    )
  })
})
