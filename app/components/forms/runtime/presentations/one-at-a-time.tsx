import { ArrowLeft } from "lucide-react"
import { useEffect, useRef } from "react"
import { Button } from "~/components/atoms/button/button"
import { Error } from "~/components/forms/base/error"
import { formRuntimeCopy } from "~/copy/forms"
import { FormProgress } from "./form-progress"
import { ownsItsPrompt } from "./owns-its-prompt"
import type { Presentation } from "./presentation.types"

/**
 * Gives the prompt heading prominence instead of a field label, so a screen
 * holding a single question reads as a question. The control is tied to the
 * heading with aria-labelledby, so the prompt is not announced twice.
 *
 * Focus lands on the control as each screen arrives, so the flow can be answered
 * from the keyboard: type, Enter, type, Enter. It is keyed on which questions
 * are showing, so a validation error does not yank focus mid-correction. The
 * screen the flow opens on is left alone unless the caller asks otherwise,
 * because taking focus there scrolls the page past whatever the form sits under.
 */
export const OneAtATime: Presentation = ({
  step,
  questions,
  answers,
  errors,
  formError,
  progress,
  isBusy,
  focusFirstScreen,
  canGoBack,
  onAnswer,
  onContinue,
  onBack,
  continueLabel,
  pendingLabel,
  renderQuestion,
}) => {
  const formRef = useRef<HTMLFormElement>(null)
  const focusedScreenRef = useRef<string | null>(null)

  const screenKey = questions.map((question) => question.id).join("|")

  useEffect(() => {
    // The opening screen is recorded without being focused, unless asked for.
    if (focusedScreenRef.current === null && !focusFirstScreen) {
      focusedScreenRef.current = screenKey
      return
    }

    // A disabled control cannot take focus, so an arriving screen waits for the
    // commit to settle. Screens already focused are left alone, which keeps a
    // failed advance from yanking focus back mid-correction.
    if (isBusy || focusedScreenRef.current === screenKey) return

    const form = formRef.current
    if (!form) return

    focusedScreenRef.current = screenKey

    const control =
      form.querySelector<HTMLElement>("input, textarea, select") ??
      form.querySelector<HTMLElement>('button[type="submit"]')

    control?.focus()
  }, [screenKey, isBusy, focusFirstScreen])

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-8 wrap-anywhere"
      onSubmit={(event) => {
        event.preventDefault()
        onContinue()
      }}
    >
      {progress ? (
        <FormProgress index={progress.index} total={progress.total} />
      ) : null}

      {step?.kind === "content" ? step.render : null}

      {questions.map((question) => (
        <div key={question.id} className="flex flex-col gap-4">
          {ownsItsPrompt(question) ? null : (
            <h2 id={`${question.id}-prompt`} className="text-2xl font-bold">
              {question.prompt}
            </h2>
          )}

          {question.help ? (
            <p className="text-muted-foreground">{question.help}</p>
          ) : null}

          {renderQuestion({
            question,
            value: answers[question.id],
            onChange: (value) => onAnswer(question.id, value),
            labelledBy: ownsItsPrompt(question)
              ? undefined
              : `${question.id}-prompt`,
          })}

          {errors[question.id] ? (
            <Error role="alert">{errors[question.id]}</Error>
          ) : null}
        </div>
      ))}

      {formError ? <Error role="alert">{formError}</Error> : null}

      <div className="flex gap-2">
        {canGoBack ? (
          <Button
            type="button"
            variant="outline"
            className="w-1/6 min-w-11"
            disabled={isBusy}
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" />
            <span className="sr-only">{formRuntimeCopy.back}</span>
          </Button>
        ) : null}

        <Button type="submit" className="flex-1" disabled={isBusy}>
          {isBusy ? pendingLabel : continueLabel}
        </Button>
      </div>
    </form>
  )
}
