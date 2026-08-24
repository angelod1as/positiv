import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { PresentationProps } from "~/components/forms/runtime/presentations/presentation.types"
import { renderQuestion } from "~/components/forms/runtime/render-question"
import { sharedCopy } from "~/copy/shared"
import { adminEventsCopy } from "~/copy/admin/events"
import { buildEventStatusQuestions } from "./build-event-status-questions"
import { EventStatusScreen } from "./event-status-presentation"

const statusCopy = adminEventsCopy.statusForm
const questions = buildEventStatusQuestions()

const draw = (overrides: Partial<PresentationProps> = {}) => {
  const onAnswer = vi.fn()
  const onContinue = vi.fn()

  render(
    <EventStatusScreen
      step={{ kind: "screen", ids: ["event_status"] }}
      questions={questions}
      answers={{ event_status: "Draft" }}
      errors={{}}
      formError={null}
      progress={null}
      isBusy={false}
      focusFirstScreen={false}
      canGoBack={false}
      onBack={vi.fn()}
      advanceRejection={null}
      onAnswer={onAnswer}
      onContinue={onContinue}
      continueLabel="Continuar"
      pendingLabel={sharedCopy.status.loading}
      renderQuestion={renderQuestion}
      {...overrides}
    />,
  )

  return { onAnswer, onContinue }
}

describe("EventStatusScreen", () => {
  it("draws the status the event is in", () => {
    draw()

    expect(screen.getByLabelText(statusCopy.label)).toHaveValue("Draft")
  })

  it("saves as soon as another status is chosen", async () => {
    const user = userEvent.setup()
    const { onAnswer, onContinue } = draw()

    await user.selectOptions(
      screen.getByLabelText(statusCopy.label),
      "Completed",
    )

    expect(onAnswer).toHaveBeenCalledWith("event_status", "Completed")
    expect(onContinue).toHaveBeenCalled()
  })

  it("asks for no confirmation of its own", () => {
    draw()

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("takes no second answer while a save is in flight", () => {
    draw({ isBusy: true })

    expect(screen.getByLabelText(statusCopy.label)).toBeDisabled()
  })

  it("says when the save could not be made", () => {
    draw({ formError: "Não foi possível salvar" })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível salvar",
    )
  })

  it("says when the status itself was refused", () => {
    draw({ errors: { event_status: "Valor inválido" } })

    expect(screen.getByRole("alert")).toHaveTextContent("Valor inválido")
  })
})
