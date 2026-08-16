import { useEffect, useRef } from "react"
import { Button } from "~/components/atoms/button/button"
import { Error } from "~/components/forms/base/error"
import type { Presentation } from "./presentation.types"

/**
 * Gives the prompt heading prominence instead of a field label, so a screen
 * holding a single question reads as a question rather than as a form of one.
 * The control is tied to the heading with aria-labelledby, which keeps the
 * prompt from being announced twice.
 *
 * Focus lands on the control as each screen arrives, so the whole flow can be
 * answered from the keyboard: type, Enter, type, Enter. It is keyed on which
 * questions are showing rather than on every render, so surfacing a validation
 * error does not yank focus away from someone mid-correction.
 */
export const OneAtATime: Presentation = ({
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
}) => {
  const formRef = useRef<HTMLFormElement>(null)

  const screenKey = questions.map((question) => question.id).join("|")

  useEffect(() => {
    const form = formRef.current
    if (!form) return

    const control =
      form.querySelector<HTMLElement>("input, textarea, select") ??
      form.querySelector<HTMLElement>('button[type="submit"]')

    control?.focus()
  }, [screenKey])

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault()
        onContinue()
      }}
    >
      {step?.kind === "content" ? step.render : null}

      {questions.map((question) => (
        <div key={question.id} className="flex flex-col gap-4">
          <h2 id={`${question.id}-prompt`} className="text-2xl font-bold">
            {question.prompt}
          </h2>

          {question.help ? (
            <p className="text-muted-foreground">{question.help}</p>
          ) : null}

          {renderQuestion({
            question,
            value: answers[question.id],
            onChange: (value) => onAnswer(question.id, value),
            labelledBy: `${question.id}-prompt`,
          })}

          {errors[question.id] ? (
            <Error role="alert">{errors[question.id]}</Error>
          ) : null}
        </div>
      ))}

      {formError ? <Error role="alert">{formError}</Error> : null}

      <Button type="submit" disabled={isBusy}>
        {continueLabel}
      </Button>
    </form>
  )
}
