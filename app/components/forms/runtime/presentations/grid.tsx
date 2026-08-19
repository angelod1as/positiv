import type { ReactNode } from "react"
import { Button } from "~/components/atoms/button/button"
import { Error } from "~/components/forms/base/error"
import { cn } from "~/lib/utils"
import type { Presentation } from "./presentation.types"
import { QuestionField } from "./question-field"

export type GridSpan = 3 | 4 | 5 | 6 | 12

export type GridSlot =
  | { kind: "question"; id: string; span?: GridSpan }
  | { kind: "note"; id: string; render: ReactNode; span?: GridSpan }

// Written out because an interpolated col-span-* is a class the Tailwind
// scanner never sees, and so a class that never reaches the stylesheet.
const SPAN_CLASS: Record<GridSpan, string> = {
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  12: "sm:col-span-12",
}

/**
 * Every question of the screen at once, laid out on twelve columns — for a form
 * that collects things someone already has in their head, where a column of
 * fourteen stacked fields would read as a much longer errand than it is.
 *
 * The caller describes the layout as an ordered list of slots, so a note can
 * sit between two questions without a presentation of its own. Build the list
 * once and hold it: a presentation that changes identity remounts the run.
 *
 * A question the slots forgot is drawn at the end in full width rather than
 * dropped, so that adding one to the flow can never make it vanish from view.
 */
export function gridPresentation(slots: GridSlot[]): Presentation {
  return function Grid({
    step,
    questions,
    answers,
    errors,
    formError,
    isBusy,
    onAnswer,
    onContinue,
    continueLabel,
    renderQuestion,
  }) {
    const placed = new Set(
      slots.flatMap((slot) => (slot.kind === "question" ? [slot.id] : [])),
    )

    const forgotten: GridSlot[] = questions
      .filter((question) => !placed.has(question.id))
      .map((question) => ({ kind: "question", id: question.id }))

    const byId = new Map(questions.map((question) => [question.id, question]))

    return (
      <form
        className="flex flex-col gap-8 wrap-anywhere"
        onSubmit={(event) => {
          event.preventDefault()
          onContinue()
        }}
      >
        {step?.kind === "content" ? step.render : null}

        <div className="flex flex-col gap-6 sm:grid sm:grid-cols-12 sm:gap-4">
          {[...slots, ...forgotten].map((slot) => {
            const className = cn(SPAN_CLASS[slot.span ?? 12])

            if (slot.kind === "note") {
              return (
                <div key={`note-${slot.id}`} className={className}>
                  {slot.render}
                </div>
              )
            }

            const question = byId.get(slot.id)
            if (!question) return null

            return (
              <QuestionField
                key={question.id}
                question={question}
                value={answers[question.id]}
                error={errors[question.id]}
                onAnswer={(value) => onAnswer(question.id, value)}
                renderQuestion={renderQuestion}
                className={className}
              />
            )
          })}
        </div>

        {formError ? <Error role="alert">{formError}</Error> : null}

        <Button type="submit" disabled={isBusy}>
          {continueLabel}
        </Button>
      </form>
    )
  }
}
