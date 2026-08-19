import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Question } from "~/components/forms/runtime/question.types"
import { renderQuestion } from "~/components/forms/runtime/render-question"
import { gridPresentation, type GridSlot } from "./grid"
import type { PresentationProps } from "./presentation.types"

const question = (id: string, prompt: string): Question => ({
  id,
  prompt,
  input: { kind: "text" },
  schema: zod.string(),
})

const questions = [
  question("full_name", "Nome completo"),
  question("cpf", "CPF"),
]

const draw = (slots: GridSlot[], overrides: Partial<PresentationProps> = {}) => {
  const Grid = gridPresentation(slots)
  const onContinue = vi.fn()
  const onAnswer = vi.fn()

  render(
    <Grid
      step={{ kind: "screen", ids: questions.map((one) => one.id) }}
      questions={questions}
      answers={{}}
      errors={{}}
      formError={null}
      progress={null}
      isBusy={false}
      focusFirstScreen={false}
      canGoBack={false}
      onBack={vi.fn()}
      onAnswer={onAnswer}
      onContinue={onContinue}
      continueLabel="Continuar"
      renderQuestion={renderQuestion}
      {...overrides}
    />,
  )

  return { onAnswer, onContinue }
}

const fieldOf = (prompt: string) => screen.getByLabelText(prompt).closest("div")

describe("gridPresentation", () => {
  it("gives each slot the width it asked for", () => {
    draw([
      { kind: "question", id: "full_name", span: 5 },
      { kind: "question", id: "cpf", span: 4 },
    ])

    expect(fieldOf("Nome completo")).toHaveClass("sm:col-span-5")
    expect(fieldOf("CPF")).toHaveClass("sm:col-span-4")
  })

  it("gives a slot with no width of its own the whole row", () => {
    draw([{ kind: "question", id: "full_name" }, { kind: "question", id: "cpf" }])

    expect(fieldOf("Nome completo")).toHaveClass("sm:col-span-12")
  })

  it("draws the slots in the order they were given, not the order of the step", () => {
    draw([
      { kind: "question", id: "cpf", span: 6 },
      { kind: "question", id: "full_name", span: 6 },
    ])

    const prompts = screen
      .getAllByText(/Nome completo|CPF/)
      .map((node) => node.textContent)

    expect(prompts).toEqual(["CPF", "Nome completo"])
  })

  it("draws a question the slots forgot rather than losing it", () => {
    draw([{ kind: "question", id: "full_name", span: 6 }])

    expect(screen.getByLabelText("CPF")).toBeInTheDocument()
  })

  it("draws a note where the slots put it", () => {
    draw([
      { kind: "question", id: "full_name", span: 6 },
      { kind: "note", id: "documentos", render: <p>Aviso sobre documentos</p> },
      { kind: "question", id: "cpf", span: 6 },
    ])

    expect(screen.getByText("Aviso sobre documentos")).toBeInTheDocument()
  })

  it("does not ask the runtime about a note", () => {
    draw([
      { kind: "note", id: "documentos", render: <p>Aviso</p>, span: 12 },
      { kind: "question", id: "full_name" },
      { kind: "question", id: "cpf" },
    ])

    expect(screen.getAllByRole("textbox")).toHaveLength(2)
  })

  it("says what went wrong with the whole screen", () => {
    draw([{ kind: "question", id: "full_name" }], {
      formError: "Não foi possível salvar",
    })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível salvar",
    )
  })

  it("says what went wrong with one question", () => {
    draw([{ kind: "question", id: "cpf", span: 4 }], {
      errors: { cpf: "CPF inválido" },
    })

    expect(screen.getByRole("alert")).toHaveTextContent("CPF inválido")
  })

  it("continues when the form is submitted", async () => {
    const user = userEvent.setup()
    const { onContinue } = draw([{ kind: "question", id: "full_name" }])

    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(onContinue).toHaveBeenCalled()
  })

  it("refuses a second submit while a commit is in flight", () => {
    draw([{ kind: "question", id: "full_name" }], { isBusy: true })

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()
  })

  it("draws the content a step brought with it", () => {
    draw([{ kind: "question", id: "full_name" }], {
      step: { kind: "content", render: <p>Antes de começar</p> },
      questions: [],
    })

    expect(screen.getByText("Antes de começar")).toBeInTheDocument()
  })
})
