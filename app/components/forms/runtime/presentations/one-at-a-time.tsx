import { Button } from "~/components/atoms/button/button"
import { Error } from "../../base/error"
import type { Presentation } from "./presentation.types"

/**
 * Gives the prompt heading prominence instead of a field label, so a screen
 * holding a single question reads as a question rather than as a form of one.
 * The control is tied to the heading with aria-labelledby, which keeps the
 * prompt from being announced twice.
 */
export const oneAtATime: Presentation = ({
  step,
  questions,
  answers,
  errors,
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

    <Button type="submit">{continueLabel}</Button>
  </form>
)
