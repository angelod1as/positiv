import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { buildLikertFlow } from "./build-likert-flow"
import { buildLikertQuestions } from "./build-likert-questions"
import { LikertOneAtATime } from "./likert-one-at-a-time"

const questions = buildLikertQuestions([
  { key: "ciume", text: "Sinto ciúme e tudo bem." },
  { key: "consentimento", text: "Pergunto antes de tocar." },
])

const setup = () => {
  const commit = vi.fn().mockResolvedValue({ ok: true })
  const onDone = vi.fn()
  const user = userEvent.setup()

  render(
    <FormRunner
      questions={questions}
      flow={buildLikertFlow(questions, commit)}
      presentation={LikertOneAtATime}
      onDone={onDone}
    />,
  )

  return { user, commit, onDone }
}

const first = () =>
  screen.getByRole("heading", { name: "Sinto ciúme e tudo bem." })
const second = () =>
  screen.queryByRole("heading", { name: "Pergunto antes de tocar." })
const comment = () => screen.getByRole("textbox", { name: /Comentário/ })

describe("LikertOneAtATime keyboard", () => {
  it.each([
    ["1", "Discordo totalmente"],
    ["2", "Discordo"],
    ["3", "Depende"],
    ["4", "Concordo"],
    ["5", "Concordo totalmente"],
  ])("picks the option numbered %s", async (key, choice) => {
    const { user } = setup()

    await user.keyboard(key)

    expect(screen.getByRole("radio", { name: choice })).toBeChecked()
    expect(screen.getByRole("radio", { name: choice })).toHaveFocus()
  })

  it.each([["{Enter}"], [" "], ["{ArrowRight}"]])(
    "moves on with %s",
    async (key) => {
      const { user } = setup()

      await user.keyboard("4")
      await user.keyboard(key)

      expect(second()).toBeVisible()
    },
  )

  it("moves back with the left arrow, keeping the answer", async () => {
    const { user } = setup()

    await user.keyboard("4{Enter}")
    await user.keyboard("{ArrowLeft}")

    expect(first()).toBeVisible()
    expect(screen.getByRole("radio", { name: "Concordo" })).toBeChecked()
  })

  it("does not move on without an answer", async () => {
    const { user } = setup()

    await user.keyboard("{Enter}")

    expect(first()).toBeVisible()
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha uma opção")
  })

  it("answers the whole scale and sends it from the keyboard alone", async () => {
    const { user, commit, onDone } = setup()

    await user.keyboard("2{Enter}")
    expect(
      await screen.findByRole("heading", { name: "Pergunto antes de tocar." }),
    ).toBeVisible()
    await user.keyboard("5{Enter}")

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(commit).toHaveBeenCalledWith({
      ciume: { choice: "disagree" },
      consentimento: { choice: "strongly_agree" },
    })
  })

  it("writes numbers, spaces, arrows and new lines in the comment", async () => {
    const { user } = setup()

    await user.keyboard("4")
    await user.click(comment())
    await user.keyboard("1 e 5{Enter}ok{ArrowLeft}{ArrowRight}")

    expect(comment()).toHaveValue("1 e 5\nok")
    expect(first()).toBeVisible()
    expect(screen.getByRole("radio", { name: "Concordo" })).toBeChecked()
  })

  it.each([["{Control>}{Enter}{/Control}"], ["{Meta>}{Enter}{/Meta}"]])(
    "moves on from the comment with %s",
    async (keys) => {
      const { user } = setup()

      await user.keyboard("4")
      await user.click(comment())
      await user.keyboard(`ok${keys}`)

      expect(second()).toBeVisible()
    },
  )

  it("leaves the comment with Escape, so the shortcuts work again", async () => {
    const { user } = setup()

    await user.keyboard("4")
    await user.click(comment())
    await user.keyboard("{Escape}")

    expect(comment()).not.toHaveFocus()
    expect(screen.getByRole("radio", { name: "Concordo" })).toHaveFocus()

    await user.keyboard("2")
    expect(screen.getByRole("radio", { name: "Discordo" })).toBeChecked()
  })

  it("leaves browser shortcuts alone", async () => {
    const { user } = setup()

    await user.keyboard("{Control>}1{/Control}{Meta>}{ArrowLeft}{/Meta}")

    expect(
      screen.getByRole("radio", { name: "Discordo totalmente" }),
    ).not.toBeChecked()
  })

  it("lets Space pick a radio reached with Tab instead of moving on", async () => {
    const { user } = setup()

    screen.getByRole("radio", { name: "Depende" }).focus()
    await user.keyboard(" ")

    expect(first()).toBeVisible()
    expect(screen.getByRole("radio", { name: "Depende" })).toBeChecked()

    await user.keyboard(" ")
    expect(second()).toBeVisible()
  })

  it("lets a focused back button go back with Enter", async () => {
    const { user } = setup()

    await user.keyboard("4{Enter}")
    screen.getByRole("button", { name: "Voltar" }).focus()
    await user.keyboard("{Enter}")

    expect(first()).toBeVisible()
  })

  it("leaves Enter to any other focused control", async () => {
    const { user } = setup()
    const widget = document.createElement("div")
    widget.setAttribute("role", "button")
    widget.tabIndex = 0
    document.body.append(widget)

    await user.keyboard("4")
    widget.focus()
    await user.keyboard("{Enter}")

    expect(first()).toBeVisible()
    widget.remove()
  })

  it("tells assistive technology about the number keys", () => {
    setup()

    expect(screen.getByRole("radio", { name: "Depende" })).toHaveAttribute(
      "aria-keyshortcuts",
      "3",
    )
  })
})
