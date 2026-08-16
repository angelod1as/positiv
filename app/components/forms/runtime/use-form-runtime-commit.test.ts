import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { CommitFn } from "./commit.types"
import type { Flow } from "./flow.types"
import type { Question } from "./question.types"
import { useFormRuntime } from "./use-form-runtime"

const question = (id: string): Question => ({
  id,
  prompt: `Pergunta ${id}`,
  input: { kind: "text" },
  schema: zod.string().min(1, { message: "Resposta obrigatória" }),
})

const questions = [question("email"), question("nome")]

const flowWithCommit = (run: CommitFn): Flow => ({
  start: "email",
  steps: {
    email: { kind: "question", id: "email" },
    nome: { kind: "question", id: "nome" },
    save: { kind: "commit", run },
  },
  next: (current) => {
    if (current === "email") return "nome"
    if (current === "nome") return "save"
    return "done"
  },
})

async function fill(
  result: { current: ReturnType<typeof useFormRuntime> },
  entries: Array<[string, string]>,
) {
  for (const [id, value] of entries) {
    await act(async () => {
      result.current.answer(id, value)
      await result.current.advance()
    })
  }
}

describe("useFormRuntime commit steps", () => {
  it("runs the commit and finishes the flow", async () => {
    const run = vi.fn(() => ({ ok: true }) as const)
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(run).toHaveBeenCalledTimes(1)
    expect(result.current.isDone).toBe(true)
  })

  it("hands the collected answers to the commit", async () => {
    const run = vi.fn(() => ({ ok: true }) as const)
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(run).toHaveBeenCalledWith({ email: "a@b.com", nome: "Angelo" })
  })

  it("awaits an asynchronous commit", async () => {
    const run: CommitFn = () => Promise.resolve({ ok: true })
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(result.current.isDone).toBe(true)
  })

  it("jumps back to the question the server rejected", async () => {
    const run: CommitFn = () => ({
      ok: false,
      errors: [{ questionId: "email", message: "E-mail já cadastrado" }],
    })
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(result.current.currentStepId).toBe("email")
    expect(result.current.isDone).toBe(false)
  })

  it("shows the server's message on that question", async () => {
    const run: CommitFn = () => ({
      ok: false,
      errors: [{ questionId: "email", message: "E-mail já cadastrado" }],
    })
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(result.current.errors.email).toBe("E-mail já cadastrado")
  })

  it("jumps to the first rejected question when several are rejected", async () => {
    const run: CommitFn = () => ({
      ok: false,
      errors: [
        { questionId: "nome", message: "Nome inválido" },
        { questionId: "email", message: "E-mail já cadastrado" },
      ],
    })
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(result.current.currentStepId).toBe("nome")
    expect(result.current.errors.nome).toBe("Nome inválido")
    expect(result.current.errors.email).toBe("E-mail já cadastrado")
  })

  it("finds the screen that owns a rejected question", async () => {
    const run: CommitFn = () => ({
      ok: false,
      errors: [{ questionId: "nome", message: "Nome inválido" }],
    })
    const screenFlow: Flow = {
      start: "both",
      steps: {
        both: { kind: "screen", ids: ["email", "nome"] },
        save: { kind: "commit", run },
      },
      next: (current) => (current === "both" ? "save" : "done"),
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: screenFlow }),
    )

    await act(async () => {
      result.current.answer("email", "a@b.com")
      result.current.answer("nome", "Angelo")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("both")
    expect(result.current.errors.nome).toBe("Nome inválido")
  })

  it("retries the commit after the rejected answer is corrected", async () => {
    const run = vi
      .fn<CommitFn>()
      .mockReturnValueOnce({
        ok: false,
        errors: [{ questionId: "email", message: "E-mail já cadastrado" }],
      })
      .mockReturnValueOnce({ ok: true })

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    await fill(result, [
      ["email", "outro@b.com"],
      ["nome", "Angelo"],
    ])

    expect(run).toHaveBeenCalledTimes(2)
    expect(result.current.isDone).toBe(true)
  })
})
