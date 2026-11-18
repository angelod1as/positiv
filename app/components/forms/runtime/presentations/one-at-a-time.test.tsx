import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Flow } from "../flow.types"
import { FormRunner } from "../form-runner"
import { likertSchema } from "../likert"
import { yearSchema } from "../year"
import type { Question } from "../question.types"
import { AllAtOnce } from "./all-at-once"
import { OneAtATime } from "./one-at-a-time"
import type { RenderQuestion } from "./presentation.types"

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

const back = () => screen.queryByRole("button", { name: "Voltar" })

const answerAndAdvance = async (
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) => {
  await user.type(screen.getByRole("textbox"), text)
  await user.click(screen.getByRole("button", { name: "Continuar" }))
}

describe("OneAtATime's way back", () => {
  it("offers no way back on the screen the flow opens on", () => {
    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    expect(back()).not.toBeInTheDocument()
  })

  it("names the button for whoever cannot see the arrow", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await answerAndAdvance(user, "Angelo")

    expect(back()).toBeInTheDocument()
  })

  it("shows the previous question with the answer still in it", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await answerAndAdvance(user, "Angelo")
    await user.click(screen.getByRole("button", { name: "Voltar" }))

    expect(
      screen.getByRole("heading", { level: 2 }).textContent,
    ).toBe("Qual seu nome?")
    expect(screen.getByRole("textbox")).toHaveValue("Angelo")
  })

  it("does not submit the form", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await answerAndAdvance(user, "Angelo")
    await user.click(screen.getByRole("button", { name: "Voltar" }))

    // A submit would have validated the empty second question and left its
    // error behind on the way past.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

// jsdom has no layout, so what a phone actually does with these is measured in
// the browser. What a test can hold onto is the class that carries the rule.
describe("what the presentations promise a narrow screen", () => {
  const drawn = (presentation: typeof OneAtATime) => {
    const { container } = render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={presentation}
        renderQuestion={renderQuestion}
      />,
    )
    return container.querySelector("form")
  }

  it.each([
    ["OneAtATime", OneAtATime],
    ["AllAtOnce", AllAtOnce],
  ])("lets %s break a word with nowhere to break", (_name, presentation) => {
    // overflow-wrap inherits, so one rule on the form reaches the prompt, the
    // help text, the error and every alternative. It has to be `anywhere` and
    // not `break-word`: only `anywhere` lowers the min-content width, and an
    // alternative's text is a flex item, which refuses to shrink under its
    // min-content. With `break-word` a long url still pushed the page sideways.
    expect(drawn(presentation)).toHaveClass("wrap-anywhere")
  })

  it("keeps the way back wide enough to tap in a narrow container", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await answerAndAdvance(user, "Angelo")

    // w-1/6 is a sixth of whatever holds the form. Inside a card on a phone
    // that lands under the 44px a finger needs.
    expect(back()).toHaveClass("min-w-11")
  })
})

describe("AllAtOnce", () => {
  it("draws no way back, having a single screen to show", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={AllAtOnce}
        renderQuestion={renderQuestion}
      />,
    )

    await answerAndAdvance(user, "Angelo")

    expect(back()).not.toBeInTheDocument()
  })
})

describe("OneAtATime with the Likert self-assessment", () => {
  const selfAssessment: Question[] = [
    {
      id: "ciume",
      prompt: "Sinto ciúme quando minha pessoa parceira sai com outra pessoa.",
      input: { kind: "likert", theme: "Ciúme" },
      schema: likertSchema,
    },
    {
      id: "desde",
      prompt: "Desde quando você vive a não-monogamia?",
      input: {
        kind: "year",
        optOut: { label: "Não vivo a não-monogamia hoje" },
      },
      schema: yearSchema,
    },
  ]

  const selfAssessmentFlow: Flow = {
    start: "ciume",
    steps: {
      ciume: { kind: "question", id: "ciume" },
      desde: { kind: "question", id: "desde" },
    },
    next: (current) => (current === "ciume" ? "desde" : "done"),
  }

  const run = (onDone = vi.fn()) => {
    render(
      <FormRunner
        questions={selfAssessment}
        flow={selfAssessmentFlow}
        presentation={OneAtATime}
        onDone={onDone}
      />,
    )
    return onDone
  }

  it("names the theme above the statement", () => {
    run()

    const theme = screen.getByText("Ciúme")
    const statement = screen.getByRole("heading", {
      name: "Sinto ciúme quando minha pessoa parceira sai com outra pessoa.",
    })

    expect(
      theme.compareDocumentPosition(statement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("draws no theme for a question without one", async () => {
    const user = userEvent.setup()
    run()

    await user.click(screen.getByRole("radio", { name: "Concordo" }))
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(screen.queryByText("Ciúme")).not.toBeInTheDocument()
  })

  it("holds the statement until a point of the scale is picked", async () => {
    const user = userEvent.setup()
    const onDone = run()

    await user.type(
      screen.getByRole("textbox", { name: "Comentário (opcional)" }),
      "Às vezes",
    )
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Escolha uma opção")
    expect(onDone).not.toHaveBeenCalled()
  })

  it("hands both answers on when the run is done", async () => {
    const user = userEvent.setup()
    const onDone = run()

    await user.click(screen.getByRole("radio", { name: "Discordo" }))
    await user.type(
      screen.getByRole("textbox", { name: "Comentário (opcional)" }),
      "Já senti mais",
    )
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Ano" }),
      "2019",
    )
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(onDone).toHaveBeenCalledWith({
      ciume: { choice: "disagree", comment: "Já senti mais" },
      desde: { year: 2019 },
    })
  })

  it("holds the question until a year is picked", async () => {
    const user = userEvent.setup()
    const onDone = run()

    await user.click(screen.getByRole("radio", { name: "Concordo" }))
    await user.click(screen.getByRole("button", { name: "Continuar" }))
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Informe o ano")
    expect(onDone).not.toHaveBeenCalled()
  })

  it("hands on opting out of the year", async () => {
    const user = userEvent.setup()
    const onDone = run()

    await user.click(screen.getByRole("radio", { name: "Concordo" }))
    await user.click(screen.getByRole("button", { name: "Continuar" }))
    await user.click(
      screen.getByRole("checkbox", { name: "Não vivo a não-monogamia hoje" }),
    )
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(onDone).toHaveBeenCalledWith({
      ciume: { choice: "agree" },
      desde: { none: true },
    })
  })
})
