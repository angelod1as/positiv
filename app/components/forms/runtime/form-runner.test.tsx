import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { formRuntimeCopy } from "~/copy/forms"
import { zod } from "~/lib/helpers/zod"
import type { Flow } from "./flow.types"
import { FormRunner } from "./form-runner"
import { AllAtOnce } from "./presentations/all-at-once"
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

// The presentations must not care how a question is drawn, so the tests inject
// their own renderer instead of depending on the real input components.
const renderQuestion: RenderQuestion = ({
  question,
  value,
  onChange,
  labelledBy,
}) => (
  <input
    id={question.id}
    aria-labelledby={labelledBy}
    value={typeof value === "string" ? value : ""}
    onChange={(event) => onChange(event.target.value)}
  />
)

const screenFlow: Flow = {
  start: "tudo",
  steps: { tudo: { kind: "screen", ids: ["nome", "cidade"] } },
  next: () => "done",
}

const steppedFlow: Flow = {
  start: "nome",
  steps: {
    nome: { kind: "question", id: "nome" },
    cidade: { kind: "question", id: "cidade" },
  },
  next: (current) => (current === "nome" ? "cidade" : "done"),
}

describe("FormRunner with allAtOnce", () => {
  it("shows every question the current step holds", () => {
    render(
      <FormRunner
        questions={questions}
        flow={screenFlow}
        presentation={AllAtOnce}
        renderQuestion={renderQuestion}
      />,
    )

    expect(screen.getByLabelText("Qual seu nome?")).toBeInTheDocument()
    expect(screen.getByLabelText("Onde você mora?")).toBeInTheDocument()
  })

  it("shows the failing question's error and does not finish", async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()

    render(
      <FormRunner
        questions={questions}
        flow={screenFlow}
        presentation={AllAtOnce}
        renderQuestion={renderQuestion}
        onDone={onDone}
      />,
    )

    await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    // The wording comes from the schema, not from the runtime, so this asserts
    // only that the failing question is the one flagged. The warning beside the
    // button is an alert too, and belongs to no question.
    const flagged = screen
      .getAllByRole("alert")
      .filter((alert) => alert.textContent !== formRuntimeCopy.fieldsRejected)

    expect(flagged).toHaveLength(1)
    expect(screen.getByLabelText("Qual seu nome?")).toHaveValue("Angelo")
    expect(onDone).not.toHaveBeenCalled()
  })

  it("finishes with every answer once all are valid", async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()

    render(
      <FormRunner
        questions={questions}
        flow={screenFlow}
        presentation={AllAtOnce}
        renderQuestion={renderQuestion}
        onDone={onDone}
      />,
    )

    await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
    await user.type(screen.getByLabelText("Onde você mora?"), "São Paulo")
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(onDone).toHaveBeenCalledWith({
      nome: "Angelo",
      cidade: "São Paulo",
    })
  })
})

// These use the real renderer on purpose. The injected fake above draws a bare
// input for every kind, which hid the fact that choice groups were unlabelled.
describe("choice groups are labelled by their prompt", () => {
  const bond: Question = {
    id: "bond",
    prompt: "Você vai acompanhade?",
    input: {
      kind: "radio",
      options: [
        { label: "Sim", value: "sim" },
        { label: "Não", value: "nao" },
      ],
    },
    schema: zod.string().min(1, { message: "Escolha uma opção" }),
  }

  const rooms: Question = {
    id: "rooms",
    prompt: "Quais espaços você conhece?",
    input: {
      kind: "checkbox",
      options: [
        { label: "Sala", value: "sala" },
        { label: "Cozinha", value: "cozinha" },
      ],
    },
    schema: zod.array(zod.string()).min(1, { message: "Escolha ao menos um" }),
  }

  const choiceFlow: Flow = {
    start: "escolhas",
    steps: { escolhas: { kind: "screen", ids: ["bond", "rooms"] } },
    next: () => "done",
  }

  it("names a radio group in allAtOnce", () => {
    render(
      <FormRunner
        questions={[bond, rooms]}
        flow={choiceFlow}
        presentation={AllAtOnce}
      />,
    )

    expect(screen.getByRole("radiogroup")).toHaveAccessibleName(
      "Você vai acompanhade?",
    )
  })

  it("names a checkbox group in allAtOnce", () => {
    render(
      <FormRunner
        questions={[bond, rooms]}
        flow={choiceFlow}
        presentation={AllAtOnce}
      />,
    )

    expect(screen.getByRole("group")).toHaveAccessibleName(
      "Quais espaços você conhece?",
    )
  })

  it("names a chip group in allAtOnce", () => {
    const chips = {
      id: "genero",
      prompt: "Como você se identifica?",
      input: {
        kind: "chips" as const,
        options: [{ label: "Travesti", value: "Travesti" }],
      },
      schema: zod.array(zod.string()).min(1, { message: "Escolha ao menos um" }),
    }

    render(
      <FormRunner
        questions={[chips]}
        flow={{
          start: "escolhas",
          steps: { escolhas: { kind: "screen", ids: ["genero"] } },
          next: () => "done",
        }}
        presentation={AllAtOnce}
      />,
    )

    expect(screen.getByRole("group")).toHaveAccessibleName(
      "Como você se identifica?",
    )
  })

  it("names a radio group in oneAtATime", () => {
    render(
      <FormRunner
        questions={[bond]}
        flow={{
          start: "bond",
          steps: { bond: { kind: "question", id: "bond" } },
          next: () => "done",
        }}
        presentation={OneAtATime}
      />,
    )

    expect(screen.getByRole("radiogroup")).toHaveAccessibleName(
      "Você vai acompanhade?",
    )
  })

  it("still points a text label at its control in allAtOnce", () => {
    render(
      <FormRunner
        questions={questions}
        flow={screenFlow}
        presentation={AllAtOnce}
      />,
    )

    expect(screen.getByLabelText("Qual seu nome?")).toHaveAttribute(
      "id",
      "nome",
    )
  })
})

describe("FormRunner with oneAtATime", () => {
  it("gives the current prompt heading prominence", () => {
    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Qual seu nome?" }),
    ).toBeInTheDocument()
  })

  it("moves to the next question once the current one is valid", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(
      screen.getByRole("heading", { name: "Onde você mora?" }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Qual seu nome?")).not.toBeInTheDocument()
  })

  it("keeps the person on the question until it is answered", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(
      screen.getByRole("heading", { name: "Qual seu nome?" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("renders a content step", async () => {
    const contentFlow: Flow = {
      start: "intro",
      steps: {
        intro: { kind: "content", render: <p>Leia as regras com atenção</p> },
        nome: { kind: "question", id: "nome" },
      },
      next: (current) => (current === "intro" ? "nome" : "done"),
    }

    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={contentFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    expect(screen.getByText("Leia as regras com atenção")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(
      screen.getByRole("heading", { name: "Qual seu nome?" }),
    ).toBeInTheDocument()
  })
})

describe("oneAtATime keyboard flow", () => {
  it("leaves the screen it opens on alone", () => {
    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    // Taking focus here scrolls the page down to the control, past whatever the
    // form was asked to sit under.
    expect(screen.getByLabelText("Qual seu nome?")).not.toHaveFocus()
  })

  it("focuses the opening screen when the form asks for it", () => {
    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
        focusFirstScreen
      />,
    )

    expect(screen.getByLabelText("Qual seu nome?")).toHaveFocus()
  })

  it("advances on Enter without reaching for the mouse", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await user.click(screen.getByLabelText("Qual seu nome?"))
    await user.keyboard("Angelo{Enter}")

    expect(
      screen.getByRole("heading", { name: "Onde você mora?" }),
    ).toBeInTheDocument()
  })

  it("moves focus to the next question's control", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await user.click(screen.getByLabelText("Qual seu nome?"))
    await user.keyboard("Angelo{Enter}")

    expect(screen.getByLabelText("Onde você mora?")).toHaveFocus()
  })

  it("focuses the continue button when a content screen arrives", async () => {
    const user = userEvent.setup()

    const contentFlow: Flow = {
      start: "nome",
      steps: {
        nome: { kind: "question", id: "nome" },
        aviso: { kind: "content", render: <p>Leia as regras</p> },
      },
      next: (current) => (current === "nome" ? "aviso" : "done"),
    }

    render(
      <FormRunner
        questions={questions}
        flow={contentFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await user.click(screen.getByLabelText("Qual seu nome?"))
    await user.keyboard("Angelo{Enter}")

    expect(screen.getByRole("button", { name: "Continuar" })).toHaveFocus()
  })

  it("does not steal focus back while the person is still typing", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Continuar" }))
    await user.click(screen.getByLabelText("Qual seu nome?"))
    await user.keyboard("An")

    expect(screen.getByLabelText("Qual seu nome?")).toHaveFocus()
  })
})

describe("a commit failure nobody can fix is still shown", () => {
  const brokenFlow: Flow = {
    start: "nome",
    steps: {
      nome: { kind: "question", id: "nome" },
      salvar: {
        kind: "commit",
        run: () => {
          throw new Error("network down")
        },
      },
    },
    next: (current) => (current === "nome" ? "salvar" : "done"),
  }

  it.each([
    ["allAtOnce", AllAtOnce],
    ["oneAtATime", OneAtATime],
  ])("surfaces the failure in %s", async (_name, presentation) => {
    const user = userEvent.setup()
    const onDone = vi.fn()

    render(
      <FormRunner
        questions={questions}
        flow={brokenFlow}
        presentation={presentation}
        renderQuestion={renderQuestion}
        onDone={onDone}
      />,
    )

    await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível salvar agora",
    )
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Qual seu nome?")).toBeInTheDocument()
  })
})

describe("the continue button reflects a commit in flight", () => {
  it.each([
    ["allAtOnce", AllAtOnce],
    ["oneAtATime", OneAtATime],
  ])("disables continue while %s is saving", async (_name, presentation) => {
    let release: (() => void) | undefined
    const slowFlow: Flow = {
      start: "nome",
      steps: {
        nome: { kind: "question", id: "nome" },
        salvar: {
          kind: "commit",
          run: () =>
            new Promise((resolve) => {
              release = () => resolve({ ok: true })
            }),
        },
      },
      next: (current) => (current === "nome" ? "salvar" : "done"),
    }

    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={slowFlow}
        presentation={presentation}
        renderQuestion={renderQuestion}
      />,
    )

    await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()

    await act(async () => {
      release?.()
    })
  })
})

describe("a misconfigured flow complains instead of going blank", () => {
  it("reports a step id that does not exist", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const user = userEvent.setup()

    const typoFlow: Flow = {
      start: "nome",
      steps: { nome: { kind: "question", id: "nome" } },
      next: () => "cidde",
    }

    render(
      <FormRunner
        questions={questions}
        flow={typoFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("cidde"))
    consoleError.mockRestore()
  })
})

describe("presentation cannot change what is collected", () => {
  it("collects the same answers through either presentation", async () => {
    const answersFrom = async (presentation: typeof AllAtOnce) => {
      const user = userEvent.setup()
      const onDone = vi.fn()

      const { unmount } = render(
        <FormRunner
          questions={questions}
          flow={steppedFlow}
          presentation={presentation}
          renderQuestion={renderQuestion}
          onDone={onDone}
        />,
      )

      await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
      await user.click(screen.getByRole("button", { name: "Continuar" }))
      await user.type(screen.getByLabelText("Onde você mora?"), "São Paulo")
      await user.click(screen.getByRole("button", { name: "Continuar" }))

      unmount()
      return onDone.mock.calls[0][0]
    }

    expect(await answersFrom(AllAtOnce)).toEqual(await answersFrom(OneAtATime))
  })
  it("does not label a boolean question twice", () => {
    const booleanQuestion: Question = {
      id: "over18",
      prompt: "Sou maior de 18 anos",
      input: { kind: "boolean" },
      schema: zod.boolean(),
    }

    const flow: Flow = {
      start: "screen",
      steps: { screen: { kind: "screen", ids: ["over18"] } },
      next: () => "done",
    }

    render(
      <FormRunner
        questions={[booleanQuestion]}
        flow={flow}
        presentation={AllAtOnce}
      />,
    )

    expect(screen.getAllByText("Sou maior de 18 anos")).toHaveLength(1)
  })

  it("does not headline a boolean question twice one at a time", () => {
    const booleanQuestion: Question = {
      id: "over18",
      prompt: "Sou maior de 18 anos",
      input: { kind: "boolean" },
      schema: zod.boolean(),
    }

    const flow: Flow = {
      start: "over18",
      steps: { over18: { kind: "question", id: "over18" } },
      next: () => "done",
    }

    render(
      <FormRunner
        questions={[booleanQuestion]}
        flow={flow}
        presentation={OneAtATime}
      />,
    )

    expect(screen.getAllByText("Sou maior de 18 anos")).toHaveLength(1)
  })
  it("does not point a boolean question at a heading it never drew", () => {
    const seen: (string | undefined)[] = []
    const booleanQuestion: Question = {
      id: "over18",
      prompt: "Sou maior de 18 anos",
      input: { kind: "boolean" },
      schema: zod.boolean(),
    }

    const flow: Flow = {
      start: "over18",
      steps: { over18: { kind: "question", id: "over18" } },
      next: () => "done",
    }

    render(
      <FormRunner
        questions={[booleanQuestion]}
        flow={flow}
        presentation={OneAtATime}
        renderQuestion={({ labelledBy }) => {
          seen.push(labelledBy)
          return <input aria-label="Sou maior de 18 anos" />
        }}
      />,
    )

    expect(seen).toEqual([undefined])
  })
})

describe("FormRunner progress", () => {
  it("shows the position on every screen of a stepped run", async () => {
    const user = userEvent.setup()

    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={OneAtATime}
        renderQuestion={renderQuestion}
      />,
    )

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "Etapa 1 de 2",
    )

    await user.type(screen.getByRole("textbox"), "Angelo")
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "Etapa 2 de 2",
    )
  })

  // Run on the stepped flow, where there is a position to show, so the test
  // proves AllAtOnce refuses it rather than that there was nothing to draw.
  it("leaves the single-screen presentation without one", () => {
    render(
      <FormRunner
        questions={questions}
        flow={steppedFlow}
        presentation={AllAtOnce}
        renderQuestion={renderQuestion}
      />,
    )

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })
})
