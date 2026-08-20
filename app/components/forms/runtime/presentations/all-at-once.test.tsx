import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { formRuntimeCopy } from "~/copy/forms"
import { zod } from "~/lib/helpers/zod"
import type { Flow } from "../flow.types"
import { FormRunner } from "../form-runner"
import type { Question } from "../question.types"
import { AllAtOnce } from "./all-at-once"

const question = (id: string, prompt: string): Question => ({
  id,
  prompt,
  input: { kind: "text" },
  // No custom message: these tests refuse fields nobody touched, which zod
  // rejects as the wrong type before any rule of the schema's own runs.
  schema: zod.string().min(1),
})

const questions = [
  question("nome", "Qual seu nome?"),
  question("cidade", "Onde você mora?"),
]

const flow: Flow = {
  start: "tudo",
  steps: { tudo: { kind: "screen", ids: ["nome", "cidade"] } },
  next: () => "done",
}

const renderScreen = () =>
  render(
    <FormRunner questions={questions} flow={flow} presentation={AllAtOnce} />,
  )

const notice = () => screen.queryByText(formRuntimeCopy.fieldsRejected)

const continueButton = () => screen.getByRole("button", { name: "Continuar" })

describe("AllAtOnce warning beside the button", () => {
  it("says nothing before anyone tries to move on", () => {
    renderScreen()

    expect(notice()).not.toBeInTheDocument()
  })

  it("warns beside the button when a field refuses the advance", async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(continueButton())

    expect(notice()).toBeInTheDocument()
  })

  it("takes focus to the first field that refused", async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(continueButton())

    expect(screen.getByLabelText("Qual seu nome?")).toHaveFocus()
  })

  it("skips a field that was answered and lands on the one that refused", async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
    await user.click(continueButton())

    expect(screen.getByLabelText("Onde você mora?")).toHaveFocus()
  })

  it("keeps drawing each question's own message", async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(continueButton())

    expect(screen.getAllByText("Campo obrigatório")).toHaveLength(2)
  })

  it("goes quiet once every refused field is answered", async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(continueButton())
    await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
    await user.type(screen.getByLabelText("Onde você mora?"), "Belo Horizonte")

    expect(notice()).not.toBeInTheDocument()
  })

  it("warns again when the next attempt is refused too", async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(continueButton())
    await user.type(screen.getByLabelText("Qual seu nome?"), "Angelo")
    continueButton().focus()

    await user.click(continueButton())

    expect(notice()).toBeInTheDocument()
    expect(screen.getByLabelText("Onde você mora?")).toHaveFocus()
  })
})
