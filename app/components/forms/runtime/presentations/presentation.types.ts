import type { ReactNode } from "react"
import type { Step } from "~/components/forms/runtime/flow.types"
import type {
  Answers,
  Question,
} from "~/components/forms/runtime/question.types"

/**
 * Draws only the control. Prompt, help text and error belong to the
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
 * A presentation decides layout and chrome only. Which questions appear
 * together is the flow's decision, made with `question` or `screen` steps.
 */
export type PresentationProps = {
  step: Step | undefined
  questions: Question[]
  answers: Answers
  errors: Record<string, string>
  /** A failure that belongs to no single question, such as a commit that threw. */
  formError: string | null
  /**
   * The questions that refused the last attempt to move on, written fresh on
   * every refusal. One question at a time can ignore it — the message is on the
   * screen already. Many at once has to say so beside its button, where the
   * person clicked; see `RejectionNotice`.
   */
  advanceRejection: { questionIds: string[] } | null
  /**
   * Where the run is along the path the flow currently projects. Null with a
   * single screen, or when the runtime cannot place the current one.
   */
  progress: { index: number; total: number } | null
  /** True while a commit is in flight, so the control can refuse a second submit. */
  isBusy: boolean
  /**
   * Whether the screen the flow opens on takes focus. Off by default: taking it
   * scrolls the page past whatever the form sits under.
   */
  focusFirstScreen: boolean
  /** Whether there is a step before this one to return to. */
  canGoBack: boolean
  onAnswer: (id: string, value: unknown) => void
  onContinue: () => void
  onBack: () => void
  continueLabel: string
  renderQuestion: RenderQuestion
}

export type Presentation = (props: PresentationProps) => ReactNode
