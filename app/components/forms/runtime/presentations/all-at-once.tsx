import { Button } from "~/components/atoms/button/button"
import { Label } from "~/components/ui/label"
import { Error } from "../../base/error"
import type { Presentation } from "./presentation.types"

export const allAtOnce: Presentation = ({
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
      <div key={question.id} className="flex flex-col gap-2">
        <Label htmlFor={question.id} className="text-muted-foreground">
          {question.prompt}
        </Label>

        {question.help ? (
          <p className="text-sm text-muted-foreground">{question.help}</p>
        ) : null}

        {renderQuestion({
          question,
          value: answers[question.id],
          onChange: (value) => onAnswer(question.id, value),
        })}

        {errors[question.id] ? (
          <Error role="alert">{errors[question.id]}</Error>
        ) : null}
      </div>
    ))}

    <Button type="submit">{continueLabel}</Button>
  </form>
)
