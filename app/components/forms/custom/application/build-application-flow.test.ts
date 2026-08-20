import { describe, expect, it, vi } from "vitest"
import { buildApplicationQuestions } from "./build-application-questions"
import { buildApplicationFlow } from "./build-application-flow"

const flowOf = (commit = vi.fn().mockResolvedValue({ ok: true })) => ({
  flow: buildApplicationFlow(buildApplicationQuestions(), commit),
  commit,
})

describe("the event application flow", () => {
  it("asks everything on one screen, the way the form always has", () => {
    const { flow } = flowOf()

    expect(flow.steps[flow.start]).toEqual({
      kind: "screen",
      ids: ["referrals", "referred", "companions", "bond", "notes"],
    })
  })

  it("sends the filled screen to be saved", () => {
    const { flow } = flowOf()

    const afterTheScreen = flow.next(flow.start, {}, {
      firstTryCorrect: {},
      data: {},
    })

    expect(flow.steps[afterTheScreen]?.kind).toBe("commit")
  })

  it("saves with the commit it was handed", async () => {
    const { flow, commit } = flowOf()

    const step = flow.steps.commit

    if (step?.kind !== "commit") throw new Error("the flow saves nothing")

    await step.run({ referred: "ninguém" })

    expect(commit).toHaveBeenCalledWith({ referred: "ninguém" })
  })

  it("is over once the save is through", () => {
    const { flow } = flowOf()

    expect(flow.next("commit", {}, { firstTryCorrect: {}, data: {} })).toBe(
      "done",
    )
  })

  it("projects the run without saving anything", () => {
    const { flow, commit } = flowOf()

    flow.next(flow.start, {}, { firstTryCorrect: {}, data: {} })
    flow.next("commit", {}, { firstTryCorrect: {}, data: {} })

    expect(commit).not.toHaveBeenCalled()
  })
})
