import type { ReactNode } from "react"
import type { Step } from "~/components/forms/runtime/flow.types"
import type {
  Answers,
  Question,
} from "~/components/forms/runtime/question.types"

/**
 * Draws only the control. The prompt, the help text and the error belong to the
 * presentation, so a question is never labelled twice.
 */
export type RenderQuestion = (args: {
  question: Question
  value: unknown
  onChange: (value: unknown) => void
  /** Set when the presentation labels the control with something other than a <label for>. */
  labelledBy?: string
}) => ReactNode

/**
 * A presentation decides layout and chrome only — how prominent the prompt is,
 * where the button sits, what surrounds it. Which questions appear together is
 * the flow's decision, made with `question` steps or a `screen` step.
 */
export type PresentationProps = {
  step: Step | undefined
  questions: Question[]
  answers: Answers
  errors: Record<string, string>
  /** A failure that belongs to no single question, such as a commit that threw. */
  formError: string | null
  onAnswer: (id: string, value: unknown) => void
  onContinue: () => void
  continueLabel: string
  renderQuestion: RenderQuestion
}

export type Presentation = (props: PresentationProps) => ReactNode
