import { describe, expect, it } from "vitest"
import type { Flow, FlowContext } from "./flow.types"
import type { Answers } from "./question.types"
import { projectPath } from "./project-path"

const context = (
  firstTryCorrect: Record<string, boolean> = {},
): FlowContext => ({ firstTryCorrect, data: {} })

const linearFlow: Flow = {
  start: "a",
  steps: {
    a: { kind: "question", id: "a" },
    b: { kind: "question", id: "b" },
    commit: { kind: "commit", run: async () => ({ ok: true }) },
  },
  next: (current) => {
    if (current === "a") return "b"
    if (current === "b") return "commit"
    return "done"
  },
}

/**
 * The shape POS-501 will take: two probes, and the long quiz only for whoever
 * got both wrong on the first attempt.
 */
const branchingFlow: Flow = {
  start: "probe-1",
  steps: {
    "probe-1": { kind: "question", id: "probe-1" },
    "probe-2": { kind: "question", id: "probe-2" },
    "quiz-1": { kind: "question", id: "quiz-1" },
    "quiz-2": { kind: "question", id: "quiz-2" },
    commit: { kind: "commit", run: async () => ({ ok: true }) },
  },
  next: (current, _answers, ctx) => {
    if (current === "probe-1") return "probe-2"

    if (current === "probe-2") {
      const stumbled =
        ctx.firstTryCorrect["probe-1"] === false &&
        ctx.firstTryCorrect["probe-2"] === false

      return stumbled ? "quiz-1" : "commit"
    }

    if (current === "quiz-1") return "quiz-2"
    if (current === "quiz-2") return "commit"

    return "done"
  },
}

const noAnswers: Answers = {}

describe("projectPath", () => {
  it("walks a linear flow from start to done", () => {
    expect(projectPath(linearFlow, noAnswers, context())).toEqual([
      "a",
      "b",
      "commit",
    ])
  })

  it("takes the optimistic branch while nobody has stumbled yet", () => {
    expect(projectPath(branchingFlow, noAnswers, context())).toEqual([
      "probe-1",
      "probe-2",
      "commit",
    ])
  })

  it("lengthens once the stumbles are recorded", () => {
    const stumbled = context({ "probe-1": false, "probe-2": false })

    expect(projectPath(branchingFlow, noAnswers, stumbled)).toEqual([
      "probe-1",
      "probe-2",
      "quiz-1",
      "quiz-2",
      "commit",
    ])
  })

  it("stops when a flow sends it back to a step it already walked", () => {
    const cyclicFlow: Flow = {
      start: "a",
      steps: {
        a: { kind: "question", id: "a" },
        b: { kind: "question", id: "b" },
      },
      next: (current) => (current === "a" ? "b" : "a"),
    }

    expect(projectPath(cyclicFlow, noAnswers, context())).toEqual(["a", "b"])
  })

  it("stops at a step the flow does not have", () => {
    const brokenFlow: Flow = {
      start: "a",
      steps: { a: { kind: "question", id: "a" } },
      next: () => "nowhere",
    }

    expect(projectPath(brokenFlow, noAnswers, context())).toEqual(["a"])
  })
})
