import { Error } from "~/components/forms/base/error"
import { cn } from "~/lib/utils"
import { Label } from "~/components/ui/label"
import type { Question } from "~/components/forms/runtime/question.types"
import { ownsItsPrompt } from "./owns-its-prompt"
import type { RenderQuestion } from "./presentation.types"

/**
 * A radio, checkbox or chip question is a group rather than one labelable
 * control, so htmlFor has nothing to point at and the prompt reaches the group
 * through aria-labelledby.
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
  className?: string
}

/**
 * One question with its prompt, its help text and its error — shared by every
 * presentation laying questions out side by side, so the rules about which
 * prompt labels what are written once.
 *
 * Three bands: what is asked, the control, what went wrong. The prompt and its
 * help sit together in the first, close enough to read as one thing; spaced
 * like the rest they read as two prompts with an input under the wrong one.
 *
 * The control is pushed to the bottom of whatever height the field is given, so
 * questions sharing a row line their controls up however much each explained.
 */
export const QuestionField = ({
  question,
  value,
  error,
  onAnswer,
  renderQuestion,
  className,
}: QuestionFieldProps) => {
  const promptId = `${question.id}-prompt`
  const choice = isChoice(question)
  const carriesPrompt = !ownsItsPrompt(question)

  return (
    // The id rides on the wrapper because a group of alternatives carries it on
    // no control at all, and the rejection notice has to find the field.
    <div
      data-question-id={question.id}
      className={cn("flex h-full flex-col gap-2", className)}
    >
      {carriesPrompt ? (
        <div className="flex flex-col gap-0.5">
          {choice ? (
            <span id={promptId} className="text-sm leading-5 font-medium">
              {question.prompt}
            </span>
          ) : (
            <Label htmlFor={question.id} className="mb-0 text-muted-foreground">
              {question.prompt}
            </Label>
          )}

          {question.help ? (
            <p className="text-xs leading-4 text-muted-foreground">
              {question.help}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Pushed to the bottom only when the control is a single line: that is
          what lines inputs up across a row however much explaining each one
          needed. A group of alternatives is tall enough to set the row's height
          itself, and dropping it would leave it floating under its own prompt. */}
      <div className={cn("flex flex-col gap-1", choice ? "" : "mt-auto")}>
        {renderQuestion({
          question,
          value,
          onChange: onAnswer,
          labelledBy: choice ? promptId : undefined,
        })}

        {/* A question that carries its own prompt has no band above to explain
            itself in, so the explanation goes under the control it belongs to
            — a box saying what ticking it means. */}
        {!carriesPrompt && question.help ? (
          <p className="text-xs leading-4 text-muted-foreground">
            {question.help}
          </p>
        ) : null}

        {error ? <Error role="alert">{error}</Error> : null}
      </div>
    </div>
  )
}
