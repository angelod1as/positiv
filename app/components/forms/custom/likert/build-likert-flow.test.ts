import { describe, expect, it, vi } from "vitest"
import { buildLikertFlow, LIKERT_COMMIT_STEP } from "./build-likert-flow"
import { buildLikertQuestions } from "./build-likert-questions"

const questions = buildLikertQuestions([
  { key: "ciume", text: "Sinto ciúme e tudo bem." },
  { key: "consentimento", text: "Pergunto antes de tocar." },
])

const context = { firstTryCorrect: {}, data: {} }

describe("buildLikertFlow", () => {
  it("walks the statements one per screen, then saves", () => {
    const flow = buildLikertFlow(questions, vi.fn())

    expect(flow.start).toBe("ciume")
    expect(flow.steps.ciume).toEqual({ kind: "question", id: "ciume" })
    expect(flow.next("ciume", {}, context)).toBe("consentimento")
    expect(flow.next("consentimento", {}, context)).toBe(LIKERT_COMMIT_STEP)
    expect(flow.next(LIKERT_COMMIT_STEP, {}, context)).toBe("done")
  })

  it("names the save with something no statement key can be", () => {
    expect(LIKERT_COMMIT_STEP).not.toMatch(/^[a-z0-9][a-z0-9-]*$/)
  })

  it("saves through the commit it was given", () => {
    const commit = vi.fn()
    const flow = buildLikertFlow(questions, commit)

    expect(flow.steps[LIKERT_COMMIT_STEP]).toEqual({
      kind: "commit",
      run: commit,
    })
  })
})
