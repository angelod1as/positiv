import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { Question } from "../question.types"
import { renderQuestion } from "../render-question"
import { QuestionField } from "./question-field"

const field = (question: Question) =>
  render(
    <QuestionField
      question={question}
      value={undefined}
      error={undefined}
      onAnswer={vi.fn()}
      renderQuestion={renderQuestion}
    />,
  )

describe("QuestionField", () => {
  it("shows the help text of a question it labels itself", () => {
    field({
      id: "cidade",
      prompt: "Onde você mora?",
      help: "A cidade basta",
      input: { kind: "text" },
      schema: zod.string(),
    })

    expect(screen.getByText("A cidade basta")).toBeVisible()
  })

  it("shows the help text of a question that draws its own prompt", () => {
    // A boolean carries its prompt beside the box, and the explanation under
    // it is what tells someone what they are agreeing to.
    field({
      id: "mktEmails",
      prompt: "Aceito receber e-mails sobre a Positiv",
      help: "Falamos de outros eventos e parcerias",
      input: { kind: "boolean" },
      schema: zod.boolean(),
    })

    expect(
      screen.getByText("Falamos de outros eventos e parcerias"),
    ).toBeVisible()
  })

  it("names the box once", () => {
    field({
      id: "agree",
      prompt: "Li tudo e estou de acordo!",
      input: { kind: "boolean" },
      schema: zod.boolean(),
    })

    expect(
      screen.getAllByText("Li tudo e estou de acordo!"),
    ).toHaveLength(1)
  })
})
