import { describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Question } from "./question.types"
import { buildSingleScreenFlow } from "./single-screen-flow"

const context = { firstTryCorrect: {}, data: {} }

const question = (id: string): Question => ({
  id,
  prompt: `Pergunta ${id}`,
  input: { kind: "text" },
  schema: zod.string(),
})

const questions = [question("email"), question("senha")]

describe("buildSingleScreenFlow", () => {
  it("puts every question on one screen", () => {
    const flow = buildSingleScreenFlow(questions, vi.fn())

    expect(flow.steps[flow.start]).toEqual({
      kind: "screen",
      ids: ["email", "senha"],
    })
  })

  it("goes from the screen to the commit, and then it is done", () => {
    const commit = vi.fn()
    const flow = buildSingleScreenFlow(questions, commit)

    const afterScreen = flow.next(flow.start, {}, context)
    expect(flow.steps[afterScreen]).toEqual({ kind: "commit", run: commit })

    expect(flow.next(afterScreen, {}, context)).toBe("done")
  })

  it("has no step between the screen and the save", () => {
    const flow = buildSingleScreenFlow(questions, vi.fn())

    expect(Object.keys(flow.steps)).toHaveLength(2)
  })

  it("takes the step names a stored run already knows", () => {
    const commit = vi.fn()
    const flow = buildSingleScreenFlow(questions, commit, {
      screenId: "form",
      commitId: "salvar",
    })

    expect(flow.start).toBe("form")
    expect(flow.steps.form).toEqual({
      kind: "screen",
      ids: ["email", "senha"],
    })
    expect(flow.next("form", {}, context)).toBe("salvar")
    expect(flow.next("salvar", {}, context)).toBe("done")
  })

  it("asks nothing when there is nothing to ask", () => {
    const flow = buildSingleScreenFlow([], vi.fn())

    expect(flow.steps[flow.start]).toEqual({ kind: "screen", ids: [] })
  })
})
