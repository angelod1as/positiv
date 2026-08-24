import { describe, expect, it, vi } from "vitest"
import { buildEventStatusFlow } from "./build-event-status-flow"
import { buildEventStatusQuestions } from "./build-event-status-questions"

const commit = vi.fn(() => ({ ok: true as const }))
const questions = buildEventStatusQuestions()
const context = { firstTryCorrect: {}, data: {} }

describe("buildEventStatusFlow", () => {
  it("asks for the status on its own screen", () => {
    const flow = buildEventStatusFlow(questions, commit)

    expect(flow.steps[flow.start]).toEqual({
      kind: "screen",
      ids: ["event_status"],
    })
  })

  it("saves as soon as the screen is answered", () => {
    const flow = buildEventStatusFlow(questions, commit)

    const afterScreen = flow.next(flow.start, {}, context)

    expect(flow.steps[afterScreen]).toEqual({ kind: "commit", run: commit })
  })

  it("comes back to the screen, because the status changes again", () => {
    const flow = buildEventStatusFlow(questions, commit)

    const afterScreen = flow.next(flow.start, {}, context)

    expect(flow.next(afterScreen, {}, context)).toBe(flow.start)
  })
})
