import { act, render, screen, waitFor } from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Flow } from "./flow.types"
import { FormRunner } from "./form-runner"
import { runtimeStorageKey, writeRuntimeState } from "./persistence"
import { OneAtATime } from "./presentations/one-at-a-time"
import type { RenderQuestion } from "./presentations/presentation.types"
import type { Question } from "./question.types"

const questions: Question[] = [
  {
    id: "nome",
    prompt: "Qual seu nome?",
    input: { kind: "text" },
    schema: zod.string().min(1, { message: "Resposta obrigatória" }),
  },
  {
    id: "cidade",
    prompt: "Onde você mora?",
    input: { kind: "text" },
    schema: zod.string().min(1, { message: "Resposta obrigatória" }),
  },
]

const renderQuestion: RenderQuestion = ({ question, value, onChange }) => (
  <input
    id={question.id}
    value={typeof value === "string" ? value : ""}
    onChange={(event) => onChange(event.target.value)}
  />
)

const flow: Flow = {
  start: "nome",
  steps: {
    nome: { kind: "question", id: "nome" },
    cidade: { kind: "question", id: "cidade" },
  },
  next: (current) => (current === "nome" ? "cidade" : "done"),
}

const persistence = { formId: "quiz", scopeId: "evento-1" }
const key = runtimeStorageKey(persistence.formId, persistence.scopeId)

const runner = (
  <FormRunner
    questions={questions}
    flow={flow}
    presentation={OneAtATime}
    renderQuestion={renderQuestion}
    persistence={persistence}
  />
)

beforeEach(() => {
  sessionStorage.clear()
})

describe("FormRunner with persistence", () => {
  it("gives way to the persisted step once the restore lands", async () => {
    writeRuntimeState(key, {
      answers: { nome: "Ana" },
      currentStepId: "cidade",
      firstTryCorrect: {},
    })

    const { container } = render(runner)

    await waitFor(() =>
      expect(screen.getByText("Onde você mora?")).toBeInTheDocument(),
    )
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
  })

  // The server has no sessionStorage, so it can only draw the placeholder —
  // and the client's first render has to draw exactly the same thing.
  it("renders the skeleton on the server, where there is no storage", () => {
    const markup = renderToString(runner)

    expect(markup).toContain('data-slot="skeleton"')
    expect(markup).not.toContain("Qual seu nome?")
  })

  it("draws the step directly when there is nothing to restore", () => {
    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    expect(screen.getByText("Qual seu nome?")).toBeInTheDocument()
  })

  it("hydrates the server markup without a mismatch", async () => {
    writeRuntimeState(key, {
      answers: { nome: "Ana" },
      currentStepId: "cidade",
      firstTryCorrect: {},
    })

    // jsdom hands renderToString a working sessionStorage, which no real
    // server has. Blinding it is what makes this test model the actual split:
    // markup produced without the record, hydrated by a client that has it.
    const blindServer = vi
      .spyOn(Storage.prototype, "getItem")
      .mockReturnValue(null)
    const markup = renderToString(runner)
    blindServer.mockRestore()

    const container = document.createElement("div")
    container.innerHTML = markup
    document.body.appendChild(container)

    const complaints: unknown[][] = []
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        complaints.push(args)
      })

    await act(async () => {
      hydrateRoot(container, runner)
    })

    consoleError.mockRestore()
    document.body.removeChild(container)

    expect(complaints).toEqual([])
  })
})
