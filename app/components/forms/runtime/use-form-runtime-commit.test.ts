import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { CommitResult } from "~types/forms/commit.types"
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

  it("visits every rejected question before running the commit again", async () => {
    // The flow's own next() would take nome straight to the commit, so without
    // tracking what is still pending, the stale rejected email would be
    // resubmitted without the person ever seeing it flagged.
    const run = vi.fn<CommitFn>().mockReturnValue({
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

    await act(async () => {
      result.current.answer("nome", "Angelo Dias")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("email")
    expect(run).toHaveBeenCalledTimes(1)
  })

  it("keeps the server's message on a rejection still waiting to be fixed", async () => {
    const run = vi.fn<CommitFn>().mockReturnValue({
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

    await act(async () => {
      result.current.answer("nome", "Angelo Dias")
      await result.current.advance()
    })

    // Arriving at the e-mail with no message would leave the person wondering
    // why they were sent back there.
    expect(result.current.currentStepId).toBe("email")
    expect(result.current.errors.email).toBe("E-mail já cadastrado")
    expect(result.current.errors.nome).toBeUndefined()
  })

  it("keeps another step's rejection while the current answer fails locally", async () => {
    const run = vi.fn<CommitFn>().mockReturnValue({
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

    // Fumbling the correction must not cost the other step its message.
    await act(async () => {
      result.current.answer("nome", "")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("nome")
    expect(result.current.errors.nome).toBeTruthy()
    expect(result.current.errors.email).toBe("E-mail já cadastrado")

    await act(async () => {
      result.current.answer("nome", "Angelo Dias")
      await result.current.advance()
    })

    expect(result.current.currentStepId).toBe("email")
    expect(result.current.errors.email).toBe("E-mail já cadastrado")
  })

  it("drops a corrected question's error from a shared screen", async () => {
    const screenFlow: Flow = {
      start: "both",
      steps: {
        both: { kind: "screen", ids: ["email", "nome"] },
        save: { kind: "commit", run: () => ({ ok: true }) },
      },
      next: (current) => (current === "both" ? "save" : "done"),
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: screenFlow }),
    )

    await act(async () => {
      await result.current.advance()
    })
    expect(Object.keys(result.current.errors)).toHaveLength(2)

    await act(async () => {
      result.current.answer("email", "a@b.com")
      await result.current.advance()
    })

    expect(result.current.errors.email).toBeUndefined()
    expect(result.current.errors.nome).toBeTruthy()
  })

  it("resumes the flow once every rejection has been revisited", async () => {
    const run = vi
      .fn<CommitFn>()
      .mockReturnValueOnce({
        ok: false,
        errors: [
          { questionId: "nome", message: "Nome inválido" },
          { questionId: "email", message: "E-mail já cadastrado" },
        ],
      })
      .mockReturnValue({ ok: true })

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    await act(async () => {
      result.current.answer("nome", "Angelo Dias")
      await result.current.advance()
    })
    await act(async () => {
      result.current.answer("email", "outro@b.com")
      await result.current.advance()
    })
    await act(async () => {
      await result.current.advance()
    })

    expect(run).toHaveBeenCalledTimes(2)
    expect(result.current.isDone).toBe(true)
  })

  it("survives a rejection that names no question", async () => {
    const run: CommitFn = () => ({ ok: false, errors: [] })

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(result.current.isDone).toBe(false)
    expect(result.current.formError).toBeTruthy()
    expect(result.current.currentStepId).toBe("nome")
  })

  it("survives a commit that throws", async () => {
    const run: CommitFn = () => {
      throw new Error("network down")
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(result.current.isDone).toBe(false)
    expect(result.current.formError).toBeTruthy()
    expect(result.current.currentStepId).toBe("nome")
  })

  it("says what the commit threw, which the form error alone hides", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const run: CommitFn = () => {
      throw new Error("network down")
    }

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("[form-runtime]"),
      expect.objectContaining({ message: "network down" }),
    )

    consoleError.mockRestore()
  })

  it("survives a commit whose promise rejects", async () => {
    const run: CommitFn = () => Promise.reject(new Error("timeout"))

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(result.current.isDone).toBe(false)
    expect(result.current.formError).toBeTruthy()
  })

  it("clears the form error on the next successful commit", async () => {
    const run = vi
      .fn<CommitFn>()
      .mockImplementationOnce(() => {
        throw new Error("network down")
      })
      .mockReturnValue({ ok: true })

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])
    expect(result.current.formError).toBeTruthy()

    await act(async () => {
      await result.current.advance()
    })

    expect(result.current.formError).toBeNull()
    expect(result.current.isDone).toBe(true)
  })

  it("reports a rejection naming a question no step asks", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const run = vi.fn<CommitFn>().mockReturnValueOnce({
      ok: false,
      errors: [
        { questionId: "nome", message: "Nome inválido" },
        { questionId: "fantasma", message: "Campo que não existe" },
      ],
    })
    run.mockReturnValue({ ok: true })

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    await act(async () => {
      result.current.answer("nome", "Angelo Dias")
      await result.current.advance()
    })

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("fantasma"),
    )
    expect(result.current.isDone).toBe(true)
    consoleError.mockRestore()
  })

  it("ignores a second advance while a commit is still running", async () => {
    // Every call gets its own resolver, so an unguarded second commit fails the
    // assertion rather than hanging the test.
    const releases: Array<() => void> = []
    const run = vi.fn<CommitFn>(
      () =>
        new Promise<CommitResult>((resolve) => {
          releases.push(() => resolve({ ok: true }))
        }),
    )

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [["email", "a@b.com"]])

    await act(async () => {
      result.current.answer("nome", "Angelo")
      const first = result.current.advance()
      const second = result.current.advance()
      releases.forEach((release) => release())
      await Promise.all([first, second])
    })

    // A double Enter on a real registration would otherwise submit twice.
    expect(run).toHaveBeenCalledTimes(1)
    expect(result.current.isDone).toBe(true)
  })

  it("reports that a commit is in flight", async () => {
    let release: (() => void) | undefined
    const run: CommitFn = () =>
      new Promise<CommitResult>((resolve) => {
        release = () => resolve({ ok: true })
      })

    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [["email", "a@b.com"]])
    expect(result.current.isBusy).toBe(false)

    let pending: Promise<void> | undefined
    await act(async () => {
      result.current.answer("nome", "Angelo")
      pending = result.current.advance()
    })

    expect(result.current.isBusy).toBe(true)

    await act(async () => {
      release?.()
      await pending
    })

    expect(result.current.isBusy).toBe(false)
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

describe("useFormRuntime a commit's rejections beside the button", () => {
  it("names the questions the commit rejected", async () => {
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

    expect(result.current.advanceRejection?.questionIds).toEqual([
      "nome",
      "email",
    ])
  })

  it("leaves the signal alone when the commit failed as a whole", async () => {
    const run: CommitFn = () => {
      throw new Error("rede caiu")
    }
    const { result } = renderHook(() =>
      useFormRuntime({ questions, flow: flowWithCommit(run) }),
    )

    await fill(result, [
      ["email", "a@b.com"],
      ["nome", "Angelo"],
    ])

    expect(result.current.formError).not.toBeNull()
    expect(result.current.advanceRejection).toBeNull()
  })
})
