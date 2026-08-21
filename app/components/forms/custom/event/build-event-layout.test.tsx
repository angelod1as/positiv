import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { calculateDerivedDates } from "~/components/forms/admin/calculate-derived-dates"
import { gridPresentation } from "~/components/forms/runtime/presentations/grid"
import type { Answers } from "~/components/forms/runtime/question.types"
import { renderQuestion } from "~/components/forms/runtime/render-question"
import { sharedCopy } from "~/copy/shared"
import { adminEventsCopy } from "~/copy/admin/events"
import { buildEventLayout } from "./build-event-layout"
import { buildEventQuestions } from "./build-event-questions"

const formCopy = adminEventsCopy.form

const questions = buildEventQuestions()
const Screen = gridPresentation(buildEventLayout())

const draw = (answers: Answers = {}) => {
  const onAnswer = vi.fn()

  render(
    <Screen
      step={{ kind: "screen", ids: questions.map((one) => one.id) }}
      questions={questions}
      answers={answers}
      errors={{}}
      formError={null}
      progress={null}
      isBusy={false}
      focusFirstScreen={false}
      canGoBack={false}
      onBack={vi.fn()}
      advanceRejection={null}
      onAnswer={onAnswer}
      onContinue={vi.fn()}
      continueLabel={formCopy.submit}
      pendingLabel={sharedCopy.status.loading}
      renderQuestion={renderQuestion}
    />,
  )

  return { onAnswer }
}

const fieldOf = (prompt: string) =>
  screen.getByLabelText(prompt).closest("[data-question-id]")

describe("buildEventLayout", () => {
  it("keeps every question the flow asks", () => {
    const placed = new Set(
      buildEventLayout().flatMap((slot) =>
        slot.kind === "question" ? [slot.id] : [],
      ),
    )

    for (const question of questions) {
      expect(placed.has(question.id)).toBe(true)
    }
  })

  it("groups the form under headings that say what is being asked", () => {
    draw()

    expect(
      screen.getByRole("heading", { name: formCopy.sections.generalData }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: formCopy.sections.dates }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: formCopy.sections.applications }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: formCopy.sections.group }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: formCopy.sections.payments }),
    ).toBeInTheDocument()
  })

  it("puts the emoji beside the name rather than under it", () => {
    draw()

    expect(fieldOf(formCopy.labels.title)).toHaveClass("sm:col-span-9")
    expect(fieldOf(formCopy.labels.emoji)).toHaveClass("sm:col-span-3")
  })

  it("fills the other times in from the one the event starts at", async () => {
    const user = userEvent.setup()
    const { onAnswer } = draw({ time_event_start: "2026-02-01T10:00" })

    await user.click(
      screen.getByRole("button", { name: formCopy.calculateDates }),
    )

    const expected = calculateDerivedDates("2026-02-01T10:00")
    for (const [field, value] of Object.entries(expected)) {
      expect(onAnswer).toHaveBeenCalledWith(field, value)
    }
  })

  it("asks for a starting time before it can work the rest out", async () => {
    const user = userEvent.setup()
    const { onAnswer } = draw()

    await user.click(
      screen.getByRole("button", { name: formCopy.calculateDates }),
    )

    expect(onAnswer).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      formCopy.startDateRequired,
    )
  })

  it("says nothing when it has what it needs", async () => {
    const user = userEvent.setup()
    draw({ time_event_start: "2026-02-01T10:00" })

    await user.click(
      screen.getByRole("button", { name: formCopy.calculateDates }),
    )

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
