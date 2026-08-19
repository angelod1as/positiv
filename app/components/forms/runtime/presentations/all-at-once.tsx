import { Button } from "~/components/atoms/button/button"
import { Label } from "~/components/ui/label"
import { Error } from "~/components/forms/base/error"
import type { Question } from "~/components/forms/runtime/question.types"
import { ownsItsPrompt } from "./owns-its-prompt"
import type { Presentation } from "./presentation.types"
import { RejectionNotice } from "./rejection-notice"

/**
 * A radio or checkbox question is drawn as a group rather than as one labelable
 * control, so htmlFor has nothing to point at and the prompt has to reach the
 * group through aria-labelledby instead.
 */
const isChoice = (question: Question) =>
  question.input.kind === "radio" || question.input.kind === "checkbox"

export const AllAtOnce: Presentation = ({
  step,
  questions,
  answers,
  errors,
  formError,
  advanceRejection,
  isBusy,
  onAnswer,
  onContinue,
  continueLabel,
  renderQuestion,
}) => (
  <form
    className="flex flex-col gap-8"
    onSubmit={(event) => {
      event.preventDefault()
      onContinue()
    }}
  >
    {step?.kind === "content" ? step.render : null}

    {questions.map((question) => {
      const promptId = `${question.id}-prompt`
      const choice = isChoice(question)

      return (
        <div
          key={question.id}
          data-question-id={question.id}
          className="flex flex-col gap-2"
        >
          {ownsItsPrompt(question) ? null : choice ? (
            <span id={promptId} className="mb-2 text-sm font-medium">
              {question.prompt}
            </span>
          ) : (
            <Label htmlFor={question.id} className="text-muted-foreground">
              {question.prompt}
            </Label>
          )}

          {question.help ? (
            <p className="text-sm text-muted-foreground">{question.help}</p>
          ) : null}

          {renderQuestion({
            question,
            value: answers[question.id],
            onChange: (value) => onAnswer(question.id, value),
            labelledBy: choice ? promptId : undefined,
          })}

          {errors[question.id] ? (
            <Error role="alert">{errors[question.id]}</Error>
          ) : null}
        </div>
      )
    })}

    {formError ? <Error role="alert">{formError}</Error> : null}

    <RejectionNotice rejection={advanceRejection} errors={errors} />

    <Button type="submit" disabled={isBusy}>
      {continueLabel}
    </Button>
  </form>
)
