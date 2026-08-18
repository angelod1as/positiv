import { describe, expect, it, vi } from "vitest"
import type { FlowContext } from "~/components/forms/runtime/flow.types"
import { buildRulesFlow } from "./build-rules-flow"
import { buildRulesQuestions } from "./build-rules-questions"

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
