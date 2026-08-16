import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Flow } from "./flow.types"
import type { Question } from "./question.types"
import { useFormRuntime } from "./use-form-runtime"

const question = (id: string): Question => ({
  id,
  prompt: `Pergunta ${id}`,
  input: { kind: "text" },
  schema: zod.string().min(1, { message: "Resposta obrigatória" }),
})

const questions = [question("a"), question("b"), question("c")]

const linearFlow: Flow = {
  start: "a",
  steps: {
    a: { kind: "question", id: "a" },
    b: { kind: "question", id: "b" },
    c: { kind: "question", id: "c" },
  },
  next: (current) => {
    if (current === "a") return "b"
    if (current === "b") return "c"
    return "done"
  },
}

describe("useFormRuntime", () => {
  it("starts on the flow's first step", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    expect(result.current.currentStepId).toBe("a")
    expect(result.current.isDone).toBe(false)
  })

  it("exposes the questions belonging to the current step", () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    expect(result.current.currentQuestions.map((q) => q.id)).toEqual(["a"])
  })

  it("advances one step at a time as questions are answered", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })
    expect(result.current.currentStepId).toBe("b")

    await act(async () => {
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })
    expect(result.current.currentStepId).toBe("c")
  })

  it("collects every answer given along the way", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })

    expect(result.current.answers).toEqual({
      a: "resposta a",
      b: "resposta b",
    })
  })

  it("finishes when the flow resolves to done", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: linearFlow }),
    )

    for (const id of ["a", "b", "c"]) {
      await act(async () => {
        result.current.answer(id, `resposta ${id}`)
        await result.current.advance()
      })
    }

    expect(result.current.isDone).toBe(true)
  })
})
