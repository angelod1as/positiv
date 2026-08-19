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
   * Swapping this for a different flow requires remounting with a new `key`.
   * Answers, the current step and first-attempt records are seeded once, and a
   * flow built inline changes identity on every render, so resetting on
   * identity would wipe the person's answers as they typed.
   */
  flow: Flow
  presentation: Presentation
  /** Override only to draw controls the built-in renderer does not cover. */
  renderQuestion?: RenderQuestion
  data?: Record<string, unknown>
  continueLabel?: string
  onDone?: (answers: Answers) => void
  /**
   * Whether the screen the flow opens on takes focus. Off by default, because
   * taking it scrolls the page to the control and past whatever sits above the
   * form. Turn it on for a form that has the page to itself.
   */
  focusFirstScreen?: boolean
  /**
   * Keeps the run alive across a refresh, under `form-runtime:<formId>:<scopeId>`.
   * Omit it for a form with nothing to lose.
   */
  persistence?: { formId: string; scopeId: string }
  /** Where the caller believes the run is, typically mirrored from the url. */
  stepId?: StepId
  /**
   * Called with the step actually showing, including when a requested one was
   * refused, so a url mirroring the run can correct itself. The direction says
   * whether the run walked forward or back, which is what a caller writing to
   * a history needs to decide between adding an entry and replacing one.
   */
  onStepChange?: (
    stepId: StepId,
    move: { direction: "forward" | "back" },
  ) => void
}

export function FormRunner({
  questions,
  flow,
  presentation: Presentation,
  renderQuestion = defaultRenderQuestion,
  data,
  continueLabel = "Continuar",
  onDone,
  focusFirstScreen = false,
  persistence,
  stepId,
  onStepChange,
}: FormRunnerProps) {
  const runtime = useFormRuntime({ questions, flow, data, persistence, stepId })
  const { answers, isDone, isRestored, currentStepId, lastMove } = runtime

  const reportedRef = useRef(false)

  // Held in a ref because callers write this callback inline: keeping it in the
  // effect's dependencies would report on every render, and a caller that
  // answers by changing state — a url, say — would never stop rendering.
  const onStepChangeRef = useRef(onStepChange)
  useEffect(() => {
    onStepChangeRef.current = onStepChange
  })

  // The step last reported, so that a direction settling after the move does
  // not report the same step twice — a caller writing to a history would take
  // the second report for a second move and record an entry for it.
  const reportedStepRef = useRef<StepId | null>(null)

  useEffect(() => {
    if (!isRestored || currentStepId === stepId) return
    if (reportedStepRef.current === currentStepId) return

    reportedStepRef.current = currentStepId
    onStepChangeRef.current?.(currentStepId, { direction: lastMove })
  }, [isRestored, currentStepId, stepId, lastMove])

  useEffect(() => {
    if (!isDone || reportedRef.current) return
    reportedRef.current = true
    onDone?.(answers)
  }, [isDone, answers, onDone])

  // The restore reads sessionStorage, which the server does not have, so it
  // runs after mount. Until it lands there is nothing truthful to draw, and a
  // placeholder of roughly the right height keeps the card from jumping.
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
