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

const correctness = (id: string, right: string): Question => ({
  id,
  prompt: `Pergunta ${id}`,
  input: {
    kind: "radio",
    options: [
      { label: "Certa", value: right },
      { label: "Errada", value: "errada" },
    ],
  },
  schema: zod
    .string()
    .min(1, { message: "Resposta obrigatória" })
    .refine((answer) => answer === right, {
      message: "Você escolheu a resposta errada",
    }),
})

const quizQuestions = [correctness("a", "certa"), question("b")]

const quizFlow: Flow = {
  start: "a",
  steps: {
    a: { kind: "question", id: "a" },
    b: { kind: "question", id: "b" },
  },
  next: (current) => (current === "a" ? "b" : "done"),
}

const screenFlow: Flow = {
  start: "both",
  steps: { both: { kind: "screen", ids: ["a", "b"] } },
  next: () => "done",
}

describe("useFormRuntime validation gating", () => {
  it("refuses to advance while the current answer is invalid", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: quizFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("a")
  })

  it("exposes the question's own error message when it blocks", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: quizFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })

    expect(result.current.errors.a).toBe("Você escolheu a resposta errada")
  })

  it("blocks when the question was never answered", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: quizFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("a")
    expect(result.current.errors.a).toBeDefined()
  })

  it("advances and clears the error once the answer is corrected", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: quizFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("a", "certa")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("b")
    expect(result.current.errors.a).toBeUndefined()
  })

  it("blocks a multi-question screen and flags only the invalid question", async () => {
    const { result } = renderHook(() =>
      useFormRuntime({ questions: quizQuestions, flow: screenFlow }),
    )

    await act(async () => {
      result.current.answer("a", "errada")
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })

    expect(result.current.isDone).toBe(false)
    expect(result.current.errors.a).toBe("Você escolheu a resposta errada")
    expect(result.current.errors.b).toBeUndefined()
  })
})
