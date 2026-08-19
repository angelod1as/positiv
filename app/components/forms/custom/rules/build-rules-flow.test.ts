import { describe, expect, it, vi } from "vitest"
import type { FlowContext } from "~/components/forms/runtime/flow.types"
import { projectPath } from "~/components/forms/runtime/project-path"
import { buildRulesFlow } from "./build-rules-flow"
import { buildRulesQuestions } from "./build-rules-questions"

const TRIGGER = "trigger"

const context: FlowContext = { firstTryCorrect: {}, data: {} }

const walk = (questionCount = 3) => {
  const questions = buildRulesQuestions().slice(0, questionCount)
  const flow = buildRulesFlow(questions, vi.fn())

  const visited: string[] = []
  let current = flow.start

  for (let guard = 0; guard < 50; guard++) {
    visited.push(current)

    const next = flow.next(current, {}, context)
    if (next === "done") return { flow, questions, visited, ended: true }

    current = next
  }

  return { flow, questions, visited, ended: false }
}

describe("buildRulesFlow", () => {
  it("asks every question once, in the order it was given", () => {
    const { questions, visited } = walk()

    const asked = visited.filter((stepId) => stepId !== "commit")

    expect(asked).toEqual(questions.map((question) => question.id))
  })

  it("reaches the end instead of looping", () => {
    expect(walk().ended).toBe(true)
  })

  it("saves after the last question and not before", () => {
    const { visited } = walk()

    expect(visited.at(-1)).toBe("commit")
  })

  it("runs the given commit when it gets there", async () => {
    const commit = vi.fn().mockResolvedValue({ ok: true })
    const questions = buildRulesQuestions().slice(0, 2)
    const flow = buildRulesFlow(questions, commit)

    const step = flow.steps.commit
    if (step.kind !== "commit") throw new Error("the last step must commit")

    await step.run({ answer: "given" })

    expect(commit).toHaveBeenCalledWith({ answer: "given" })
  })

  it("gives every question a step of its own, so a rejection has somewhere to land", () => {
    const { flow, questions } = walk(5)

    for (const question of questions) {
      expect(flow.steps[question.id]).toEqual({
        kind: "question",
        id: question.id,
      })
    }
  })
})

const stumbles = (...ids: string[]): FlowContext => ({
  firstTryCorrect: Object.fromEntries(ids.map((id) => [id, false])),
  data: {},
})

const veteranFlow = () => {
  const questions = buildRulesQuestions()
  const flow = buildRulesFlow(questions, vi.fn(), { isVeteran: true })

  const order = questions.map((question) => question.id)
  const [probeA, probeB] = order.filter((id) => id !== TRIGGER)

  return { flow, order, probeA, probeB }
}

const walkWith = (flow: ReturnType<typeof veteranFlow>["flow"], context: FlowContext) => {
  const visited: string[] = []
  let current = flow.start

  for (let guard = 0; guard < 50; guard++) {
    visited.push(current)

    const next = flow.next(current, {}, context)
    if (next === "done") return visited

    current = next
  }

  throw new Error("the veteran flow never ended")
}

describe("buildRulesFlow for someone who has been to a Positiv", () => {
  it("opens on the question that asks how they are", () => {
    expect(veteranFlow().flow.start).toBe(TRIGGER)
  })

  it("saves after three screens when nothing went wrong", () => {
    const { flow, probeA, probeB } = veteranFlow()

    expect(walkWith(flow, context)).toEqual([TRIGGER, probeA, probeB, "commit"])
  })

  it("still saves after three screens when only one probe tripped them", () => {
    const { flow, probeA, probeB } = veteranFlow()

    expect(walkWith(flow, stumbles(probeA))).toEqual([
      TRIGGER,
      probeA,
      probeB,
      "commit",
    ])
  })

  it("asks the whole quiz when both probes tripped them", () => {
    const { flow, order, probeA, probeB } = veteranFlow()

    const visited = walkWith(flow, stumbles(probeA, probeB))
    const asked = visited.filter((stepId) => stepId !== "commit")

    expect(asked).toHaveLength(order.length)
    expect(new Set(asked)).toEqual(new Set(order))
    expect(asked.slice(0, 3)).toEqual([TRIGGER, probeA, probeB])
  })

  it("reads a first attempt nobody has made yet as no mistake", () => {
    const { flow, probeA, probeB } = veteranFlow()

    // The runtime projects the run on every render to count the screens, long
    // before anyone answers. A flow that guessed the other way would announce
    // the long quiz to a veteran who has not tripped on anything.
    expect(flow.next(probeB, {}, { firstTryCorrect: {}, data: {} })).toBe(
      "commit",
    )
    expect(
      flow.next(probeB, {}, { firstTryCorrect: { [probeA]: true }, data: {} }),
    ).toBe("commit")
  })

  it("does not fall over on a context the runtime has not filled in yet", () => {
    const { flow, probeB } = veteranFlow()

    const partial = {} as FlowContext

    expect(() => flow.next(probeB, {}, partial)).not.toThrow()
    expect(flow.next(probeB, {}, partial)).toBe("commit")
  })

  it("answers the same way every time it is asked", () => {
    const { flow, probeA, probeB } = veteranFlow()
    const context = stumbles(probeA, probeB)

    const once = flow.next(probeB, {}, context)
    const twice = flow.next(probeB, {}, context)

    expect(once).toBe(twice)
  })

  it("leaves the quiz linear for someone who has never been", () => {
    const questions = buildRulesQuestions()
    const flow = buildRulesFlow(questions, vi.fn(), { isVeteran: false })

    expect(flow.start).toBe(questions[0].id)
  })
})

describe("what the veteran flow promises the progress count", () => {
  it("counts three screens until both probes have gone wrong, then all of them", () => {
    const { flow, order, probeA, probeB } = veteranFlow()

    const screens = (context: FlowContext) =>
      projectPath(flow, {}, context).filter((id) => id !== "commit").length

    expect(screens(context)).toBe(3)
    expect(screens(stumbles(probeA))).toBe(3)
    expect(screens(stumbles(probeA, probeB))).toBe(order.length)
  })
})
