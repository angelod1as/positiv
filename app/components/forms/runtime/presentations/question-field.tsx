import { Error } from "~/components/forms/base/error"
import { Label } from "~/components/ui/label"
import type { Question } from "~/components/forms/runtime/question.types"
import { ownsItsPrompt } from "./owns-its-prompt"
import type { RenderQuestion } from "./presentation.types"

/**
 * A radio, checkbox or chip question is drawn as a group rather than as one
 * labelable control, so htmlFor has nothing to point at and the prompt has to
 * reach the group through aria-labelledby instead.
 */
const isChoice = (question: Question) =>
  question.input.kind === "radio" ||
  question.input.kind === "checkbox" ||
  question.input.kind === "chips"

type QuestionFieldProps = {
  question: Question
  value: unknown
  error: string | undefined
  onAnswer: (value: unknown) => void
  renderQuestion: RenderQuestion
}

/**
 * One question with its prompt, its help text and its error — shared by every
 * presentation that lays questions out side by side, so that the rules about
 * which prompt labels what are written once.
 */
export const QuestionField = ({
  question,
  value,
  error,
  onAnswer,
  renderQuestion,
}: QuestionFieldProps) => {
  const promptId = `${question.id}-prompt`
  const choice = isChoice(question)

  return (
    <div className="flex flex-col gap-2">
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
        value,
        onChange: onAnswer,
        labelledBy: choice ? promptId : undefined,
      })}

      {error ? <Error role="alert">{error}</Error> : null}
    </div>
  )
}
