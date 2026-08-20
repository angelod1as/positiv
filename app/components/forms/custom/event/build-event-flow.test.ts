import { describe, expect, it, vi } from "vitest"
import { buildEventFlow } from "./build-event-flow"
import { buildEventQuestions } from "./build-event-questions"

const commit = vi.fn(() => ({ ok: true as const }))
const questions = buildEventQuestions()

describe("buildEventFlow", () => {
  it("asks everything on one screen", () => {
    const flow = buildEventFlow(questions, commit)

    expect(flow.steps[flow.start]).toEqual({
      kind: "screen",
      ids: questions.map((question) => question.id),
    })
  })

  it("saves once the screen is answered, and then is done", () => {
    const flow = buildEventFlow(questions, commit)

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
