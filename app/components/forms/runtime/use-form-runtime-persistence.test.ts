import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Flow } from "./flow.types"
import { runtimeStorageKey, writeRuntimeState } from "./persistence"
import type { Question } from "./question.types"
import { useFormRuntime } from "./use-form-runtime"

const question = (id: string): Question => ({
  id,
  prompt: `Pergunta ${id}`,
  input: { kind: "text" },
  schema: zod.string().min(1, { message: "Resposta obrigatória" }),
})

const questions = [question("a"), question("b"), question("c")]

const flow: Flow = {
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

const persistence = { formId: "quiz", scopeId: "evento-1" }
const key = runtimeStorageKey(persistence.formId, persistence.scopeId)

const mount = () =>
  renderHook(() => useFormRuntime({ questions, flow, persistence }))

beforeEach(() => {
  sessionStorage.clear()
})

describe("useFormRuntime persistence", () => {
  it("holds back until the restore has run", async () => {
    const seen: boolean[] = []

    const { result } = renderHook(() => {
      const runtime = useFormRuntime({ questions, flow, persistence })
      seen.push(runtime.isRestored)
      return runtime
    })

    await waitFor(() => expect(result.current.isRestored).toBe(true))

    // The first render reports false, which is also what the server renders,
    // so the markup being hydrated matches and the restore cannot cause a
    // mismatch.
    expect(seen[0]).toBe(false)
  })

  it("comes back to the same step with the answers filled in", async () => {
    writeRuntimeState(key, {
      answers: { a: "resposta a" },
      currentStepId: "b",
      firstTryCorrect: {},
    })

    const { result } = mount()

    await waitFor(() => expect(result.current.isRestored).toBe(true))
    expect(result.current.currentStepId).toBe("b")
    expect(result.current.answers).toEqual({ a: "resposta a" })
  })

  it("restores firstTryCorrect, which a branch may key off", async () => {
    writeRuntimeState(key, {
      answers: {},
      currentStepId: "a",
      firstTryCorrect: { sonda: false },
    })

    const { result } = mount()

    await waitFor(() =>
      expect(result.current.firstTryCorrect).toEqual({ sonda: false }),
    )
  })

  it("carries the restored answers into the next branching decision", async () => {
    writeRuntimeState(key, {
      answers: { a: "resposta a" },
      currentStepId: "b",
      firstTryCorrect: { a: false },
    })

    const seen: { answers: unknown; firstTryCorrect: unknown }[] = []
    const recordingFlow: Flow = {
      ...flow,
      next: (current, answers, context) => {
        seen.push({ answers, firstTryCorrect: context.firstTryCorrect })
        return flow.next(current, answers, context)
      },
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: recordingFlow, persistence }),
    )
    await waitFor(() => expect(result.current.isRestored).toBe(true))

    await act(async () => {
      result.current.answer("b", "resposta b")
      await result.current.advance()
    })

    expect(seen).toEqual([
      {
        answers: { a: "resposta a", b: "resposta b" },
        firstTryCorrect: { a: false, b: true },
      },
    ])
  })

  it("writes every answer and step back to storage", async () => {
    const { result } = mount()
    await waitFor(() => expect(result.current.isRestored).toBe(true))

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })

    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem(key) ?? "null")).toMatchObject({
        answers: { a: "resposta a" },
        currentStepId: "b",
        firstTryCorrect: { a: true },
      }),
    )
  })

  it("clears the record once the flow finishes", async () => {
    const { result } = mount()
    await waitFor(() => expect(result.current.isRestored).toBe(true))

    for (const id of ["a", "b", "c"]) {
      await act(async () => {
        result.current.answer(id, `resposta ${id}`)
        await result.current.advance()
      })
    }

    expect(result.current.isDone).toBe(true)
    await waitFor(() => expect(sessionStorage.getItem(key)).toBeNull())
  })

  it("starts over when the persisted step is gone from the flow", async () => {
    writeRuntimeState(key, {
      answers: { a: "resposta a" },
      currentStepId: "step-que-nao-existe-mais",
      firstTryCorrect: {},
    })

    const { result } = mount()

    await waitFor(() => expect(result.current.isRestored).toBe(true))
    expect(result.current.currentStepId).toBe("a")
    expect(result.current.answers).toEqual({})
  })

  it("touches no storage without a persistence key", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem")
    const setItem = vi.spyOn(Storage.prototype, "setItem")

    const { result } = renderHook(() => useFormRuntime({ questions, flow }))

    expect(result.current.isRestored).toBe(true)

    await act(async () => {
      result.current.answer("a", "resposta a")
      await result.current.advance()
    })

    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()

    getItem.mockRestore()
    setItem.mockRestore()
  })
})
