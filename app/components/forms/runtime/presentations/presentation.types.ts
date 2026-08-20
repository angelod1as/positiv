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
  /**
   * The questions that refused the last attempt to move on, written fresh on
   * every refusal. A presentation showing one question at a time can ignore it:
   * the message is already on the screen. One showing many at once has to say
   * so beside its button — see `RejectionNotice`.
   */
  advanceRejection: { questionIds: string[] } | null
  /**
   * Where the run is along the path the flow currently projects. Null when
   * there is a single screen, or when the runtime cannot place the current one.
   * A presentation that shows everything at once has no use for it.
   */
  progress: { index: number; total: number } | null
  /** True while a commit is in flight, so the control can refuse a second submit. */
  isBusy: boolean
  /**
   * Whether the screen the flow opens on takes focus. Off by default: taking it
   * scrolls the page down to the control, past anything the form sits under.
   * A form that owns its page wants it on.
   */
  focusFirstScreen: boolean
  /**
   * Whether there is a step before this one to return to. False on the screen
   * the flow opens on, and on a presentation showing everything at once.
   */
  canGoBack: boolean
  onAnswer: (id: string, value: unknown) => void
  onContinue: () => void
  onBack: () => void
  continueLabel: string
  /** What the button says while a commit is in flight, in place of the label. */
  pendingLabel: string
  renderQuestion: RenderQuestion
}

export type Presentation = (props: PresentationProps) => ReactNode
