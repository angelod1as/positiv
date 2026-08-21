import { useEffect, useRef } from "react"
import { Skeleton } from "~/components/ui/skeleton"
import type { Flow, StepId } from "./flow.types"
import type {
  Presentation,
  RenderQuestion,
} from "./presentations/presentation.types"
import type { Answers, Question } from "./question.types"
import { renderQuestion as defaultRenderQuestion } from "./render-question"
import { useFormRuntime } from "./use-form-runtime"

type FormRunnerProps = {
  questions: Question[]
  /**
   * Swapping this for a different flow requires remounting with a new `key`:
   * answers and first-attempt records are seeded once, and a flow built inline
   * changes identity every render, so resetting on identity would wipe them.
   */
  flow: Flow
  presentation: Presentation
  /** Override only to draw controls the built-in renderer does not cover. */
  renderQuestion?: RenderQuestion
  data?: Record<string, unknown>
  /**
   * Answers the run opens with, for a form correcting something rather than
   * collecting it. Read once: changing it later does not reset the run.
   */
  initialAnswers?: Answers
  continueLabel?: string
  onDone?: (answers: Answers) => void
  /**
   * Whether the screen the flow opens on takes focus. Off by default: taking it
   * scrolls the page past whatever the form sits under. On for a form that owns
   * its page.
   */
  focusFirstScreen?: boolean
  /** Keeps the run alive across a refresh, under `form-runtime:<formId>:<scopeId>`. */
  persistence?: { formId: string; scopeId: string }
  /** Where the caller believes the run is, typically mirrored from the url. */
  stepId?: StepId
  /**
   * Called with the step actually showing, including when a requested one was
   * refused, so a url mirroring the run can correct itself. The direction is
   * what lets a caller writing history choose between pushing and replacing.
   */
  onStepChange?: (
    stepId: StepId,
    move: { direction: "forward" | "back" },
  ) => void
  /**
   * Called with how long the run is projected to be, and again whenever that
   * changes — a flow branching on an early mistake grows mid-run.
   */
  onProgressChange?: (progress: { index: number; total: number } | null) => void
}

export function FormRunner({
  questions,
  flow,
  presentation: Presentation,
  renderQuestion = defaultRenderQuestion,
  data,
  initialAnswers,
  continueLabel = "Continuar",
  onDone,
  focusFirstScreen = false,
  persistence,
  stepId,
  onStepChange,
  onProgressChange,
}: FormRunnerProps) {
  const runtime = useFormRuntime({
    questions,
    flow,
    data,
    initialAnswers,
    persistence,
    stepId,
  })
  const { answers, isDone, isRestored, currentStepId, lastMove } = runtime

  const reportedRef = useRef(false)

  // Held in a ref because callers write this inline: in the effect's deps it
  // would report every render, and a caller answering with state would never
  // settle.
  const onStepChangeRef = useRef(onStepChange)
  useEffect(() => {
    onStepChangeRef.current = onStepChange
  })

  // The step last reported, so a direction settling after the move is not taken
  // for a second move and written to a history as one.
  const reportedStepRef = useRef<StepId | null>(null)

  useEffect(() => {
    if (!isRestored || currentStepId === stepId) return
    if (reportedStepRef.current === currentStepId) return

    reportedStepRef.current = currentStepId
    onStepChangeRef.current?.(currentStepId, { direction: lastMove })
  }, [isRestored, currentStepId, stepId, lastMove])

  const onProgressChangeRef = useRef(onProgressChange)
  useEffect(() => {
    onProgressChangeRef.current = onProgressChange
  })

  useEffect(() => {
    if (!isRestored) return

    onProgressChangeRef.current?.(runtime.progress)
  }, [isRestored, runtime.progress])

  useEffect(() => {
    if (!isDone || reportedRef.current) return
    reportedRef.current = true
    onDone?.(answers)
  }, [isDone, answers, onDone])

  // The restore reads sessionStorage, so it runs after mount. Until it lands
  // there is nothing truthful to draw, and a placeholder of roughly the right
  // height keeps the card from jumping.
  if (!isRestored) {
    return (
      <div className="flex flex-col gap-8" aria-busy="true">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    )
  }

  if (isDone) return null

  return (
    <Presentation
      step={runtime.currentStep}
      questions={runtime.currentQuestions}
      answers={runtime.answers}
      errors={runtime.errors}
      formError={runtime.formError}
      advanceRejection={runtime.advanceRejection}
      progress={runtime.progress}
      isBusy={runtime.isBusy}
      focusFirstScreen={focusFirstScreen}
      canGoBack={runtime.canGoBack}
      onAnswer={runtime.answer}
      onContinue={() => {
        void runtime.advance()
      }}
      onBack={runtime.goBack}
      continueLabel={continueLabel}
      renderQuestion={renderQuestion}
    />
  )
}
