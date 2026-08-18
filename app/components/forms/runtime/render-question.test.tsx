import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { zod } from "~/lib/helpers/zod"
import type { InputSpec, Question } from "./question.types"
import { renderQuestion } from "./render-question"

const question = (input: InputSpec): Question => ({
  id: "campo",
  prompt: "Pergunta",
  input,
  schema: zod.unknown(),
})

const draw = (input: InputSpec, value: unknown = undefined) => {
  const onChange = vi.fn()
  render(
    <>
      <label htmlFor="campo" id="campo-prompt">
        Pergunta
      </label>
      {renderQuestion({
        question: question(input),
        value,
        onChange,
        labelledBy: "campo-prompt",
      })}
    </>,
  )
  return onChange
}

const options = [
  { label: "Sim", value: "sim" },
  { label: "Não", value: "nao" },
  { label: "Talvez", value: "talvez" },
]

describe("renderQuestion", () => {
  it("draws a text field that reports what was typed", async () => {
    const user = userEvent.setup()
    const onChange = draw({ kind: "text" })

    await user.type(screen.getByLabelText("Pergunta"), "a")

    expect(onChange).toHaveBeenCalledWith("a")
  })

  it("draws a number field", () => {
    draw({ kind: "textnumber" })

    expect(screen.getByRole("spinbutton")).toBeInTheDocument()
  })

  it("draws a multiline field that reports what was typed", async () => {
    const user = userEvent.setup()
    const onChange = draw({ kind: "textarea" })

    const field = screen.getByLabelText("Pergunta")
    expect(field.tagName).toBe("TEXTAREA")

    await user.type(field, "b")
    expect(onChange).toHaveBeenCalledWith("b")
  })

  it("draws a date field", () => {
    draw({ kind: "date" })

    expect(screen.getByLabelText("Pergunta")).toHaveAttribute("type", "date")
  })

  it("draws a select and reports the chosen option", async () => {
    const user = userEvent.setup()
    const onChange = draw({ kind: "select", options })

    await user.selectOptions(screen.getByLabelText("Pergunta"), "nao")

    expect(onChange).toHaveBeenCalledWith("nao")
  })

  it("draws one radio per option and reports the chosen value", async () => {
    const user = userEvent.setup()
    const onChange = draw({ kind: "radio", options })

    expect(screen.getAllByRole("radio")).toHaveLength(3)

    await user.click(screen.getByRole("radio", { name: "Talvez" }))
    expect(onChange).toHaveBeenCalledWith("talvez")
  })

  it("marks the currently chosen radio", () => {
    draw({ kind: "radio", options }, "sim")

    expect(screen.getByRole("radio", { name: "Sim" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Não" })).not.toBeChecked()
  })

  it("draws one checkbox per option and reports an array", async () => {
    const user = userEvent.setup()
    const onChange = draw({ kind: "checkbox", options })

    await user.click(screen.getByRole("checkbox", { name: "Sim" }))

    expect(onChange).toHaveBeenCalledWith(["sim"])
  })

  it("adds to the existing selection", async () => {
    const user = userEvent.setup()
    const onChange = draw({ kind: "checkbox", options }, ["sim"])

    await user.click(screen.getByRole("checkbox", { name: "Talvez" }))

    expect(onChange).toHaveBeenCalledWith(["sim", "talvez"])
  })

  it("removes from the existing selection", async () => {
    const user = userEvent.setup()
    const onChange = draw({ kind: "checkbox", options }, ["sim", "talvez"])

    await user.click(screen.getByRole("checkbox", { name: "Sim" }))

    expect(onChange).toHaveBeenCalledWith(["talvez"])
  })

  it("labels a choice group with the prompt", () => {
    draw({ kind: "radio", options })

    expect(screen.getByRole("radiogroup")).toHaveAccessibleName("Pergunta")
  })
  it("draws an e-mail field that reports what was typed", async () => {
    const user = userEvent.setup()
    const onChange = draw({ kind: "email" })

    const field = screen.getByLabelText("Pergunta")
    expect(field).toHaveAttribute("type", "email")

    await user.type(field, "a")
    expect(onChange).toHaveBeenCalledWith("a")
  })

  it("draws a masked password field that reports what was typed", async () => {
    const user = userEvent.setup()
    const onChange = draw({ kind: "password", autoComplete: "new-password" })

    const field = screen.getByLabelText("Pergunta")
    expect(field).toHaveAttribute("type", "password")
    expect(field).toHaveAttribute("autocomplete", "new-password")

    await user.type(field, "a")
    expect(onChange).toHaveBeenCalledWith("a")
  })
})
