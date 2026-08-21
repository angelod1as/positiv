import { Button } from "~/components/atoms/button/button"
import { Error } from "~/components/forms/base/error"
import type { Presentation } from "./presentation.types"
import { QuestionField } from "./question-field"
import { RejectionNotice } from "./rejection-notice"

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
    className="flex flex-col gap-8 wrap-anywhere"
    onSubmit={(event) => {
      event.preventDefault()
      onContinue()
    }}
  >
    {step?.kind === "content" ? step.render : null}

    {questions.map((question) => (
      <QuestionField
        key={question.id}
        question={question}
        value={answers[question.id]}
        error={errors[question.id]}
        onAnswer={(value) => onAnswer(question.id, value)}
        renderQuestion={renderQuestion}
      />
    ))}

    {formError ? <Error role="alert">{formError}</Error> : null}

    <RejectionNotice rejection={advanceRejection} errors={errors} />

    <Button type="submit" disabled={isBusy}>
      {continueLabel}
    </Button>
  </form>
)
