import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Flow } from "./flow.types"
import { FormRunner } from "./form-runner"
import { OneAtATime } from "./presentations/one-at-a-time"
import type { RenderQuestion } from "./presentations/presentation.types"
import type { Question } from "./question.types"

const question = (id: string, prompt: string): Question => ({
  id,
  prompt,
  input: { kind: "text" },
  schema: zod.string().min(1, { message: "Resposta obrigatória" }),
})

const questions = [
  question("nome", "Qual seu nome?"),
  question("cidade", "Onde você mora?"),
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

const shown = () => screen.getByRole("heading", { level: 2 }).textContent

const answerAndAdvance = async (
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) => {
  await user.type(screen.getByRole("textbox"), text)
  await user.click(screen.getByRole("button", { name: "Continuar" }))
}

describe("FormRunner told which step to show", () => {
  it("reports every step it moves to", async () => {
    const user = userEvent.setup()
    const onStepChange = vi.fn()

    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
        onStepChange={onStepChange}
      />,
    )

    await answerAndAdvance(user, "Angelo")

    expect(onStepChange).toHaveBeenLastCalledWith("cidade")
  })

  it("goes back to a question already answered when asked to", async () => {
    const user = userEvent.setup()

    const view = render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
        stepId="nome"
      />,
    )

    await answerAndAdvance(user, "Angelo")
    expect(shown()).toBe("Onde você mora?")

    // What a caller mirroring the step in the url does: it follows the runtime
    // forward, and then the browser's back button hands the old step back.
    view.rerender(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
        stepId="cidade"
      />,
    )

    view.rerender(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
        stepId="nome"
      />,
    )

    expect(shown()).toBe("Qual seu nome?")
  })

  it("refuses to jump ahead to a question nobody has answered", () => {
    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
        stepId="cidade"
      />,
    )

    expect(shown()).toBe("Qual seu nome?")
  })

  it("tells the caller where it actually is when it refuses", () => {
    const onStepChange = vi.fn()

    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
        stepId="cidade"
        onStepChange={onStepChange}
      />,
    )

    expect(onStepChange).toHaveBeenCalledWith("nome")
  })

  it("ignores a step this flow does not have", () => {
    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
        stepId="pergunta-de-outro-formulário"
      />,
    )

    expect(shown()).toBe("Qual seu nome?")
  })
})
