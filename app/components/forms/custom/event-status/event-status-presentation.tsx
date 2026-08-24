import { Error } from "~/components/forms/base/error"
import type { Presentation } from "~/components/forms/runtime/presentations/presentation.types"
import { QuestionField } from "~/components/forms/runtime/presentations/question-field"

/**
 * One question that saves itself. There is no button, because there is nothing
 * to confirm: an admin who picks a status has said everything the form wanted
 * to know, and asking them to say it twice is a step that earns nothing.
 *
 * The fieldset is what refuses a second answer while the first is still in
 * flight — two quick changes used to race, and the one that landed last won by
 * luck rather than by being the one that was asked for.
 */
export const EventStatusScreen: Presentation = ({
  questions,
  answers,
  errors,
  formError,
  isBusy,
  onAnswer,
  onContinue,
  renderQuestion,
}) => (
  <form
    className="flex flex-col gap-2"
    onSubmit={(event) => {
      event.preventDefault()
      onContinue()
    }}
  >
    <fieldset disabled={isBusy} className="flex flex-col gap-2">
      {questions.map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          value={answers[question.id]}
          error={errors[question.id]}
          onAnswer={(value) => {
            onAnswer(question.id, value)
            onContinue()
          }}
          renderQuestion={renderQuestion}
        />
      ))}
    </fieldset>

    {formError ? <Error role="alert">{formError}</Error> : null}
  </form>
)
