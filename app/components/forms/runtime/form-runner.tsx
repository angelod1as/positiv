import { useEffect, useRef } from "react"
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
  flow: Flow
  presentation: Presentation
  /** Override only to draw controls the built-in renderer does not cover. */
  renderQuestion?: RenderQuestion
  data?: Record<string, unknown>
  continueLabel?: string
  onDone?: (answers: Answers) => void
}

export function FormRunner({
  questions,
  flow,
  presentation: Presentation,
  renderQuestion = defaultRenderQuestion,
  data,
  continueLabel = "Continuar",
  onDone,
}: FormRunnerProps) {
  const runtime = useFormRuntime({ questions, flow, data })
  const { answers, isDone } = runtime

  const reportedRef = useRef(false)

  useEffect(() => {
    if (!isDone || reportedRef.current) return
    reportedRef.current = true
    onDone?.(answers)
  }, [isDone, answers, onDone])

  if (isDone) return null

  return (
    <Presentation
      step={runtime.currentStep}
      questions={runtime.currentQuestions}
      answers={runtime.answers}
      errors={runtime.errors}
      onAnswer={runtime.answer}
      onContinue={() => {
        void runtime.advance()
      }}
      continueLabel={continueLabel}
      renderQuestion={renderQuestion}
    />
  )
}
