import { useEffect, useRef } from "react"
import { Skeleton } from "~/components/ui/skeleton"
import type { Flow } from "./flow.types"
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
   * Keeps the run alive across a refresh, under `form-runtime:<formId>:<scopeId>`.
   * Omit it for a form with nothing to lose.
   */
  persistence?: { formId: string; scopeId: string }
}

export function FormRunner({
  questions,
  flow,
  presentation: Presentation,
  renderQuestion = defaultRenderQuestion,
  data,
  continueLabel = "Continuar",
  onDone,
  persistence,
}: FormRunnerProps) {
  const runtime = useFormRuntime({ questions, flow, data, persistence })
  const { answers, isDone } = runtime

  const reportedRef = useRef(false)

  useEffect(() => {
    if (!isDone || reportedRef.current) return
    reportedRef.current = true
    onDone?.(answers)
  }, [isDone, answers, onDone])

  // The restore reads sessionStorage, which the server does not have, so it
  // runs after mount. Until it lands there is nothing truthful to draw, and a
  // placeholder of roughly the right height keeps the card from jumping.
  if (!runtime.isRestored) {
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
      isBusy={runtime.isBusy}
      onAnswer={runtime.answer}
      onContinue={() => {
        void runtime.advance()
      }}
      continueLabel={continueLabel}
      renderQuestion={renderQuestion}
    />
  )
}
