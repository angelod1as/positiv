import { useCallback, useMemo, useRef, useState } from "react"
import type { Flow, StepId } from "./flow.types"
import type { Answers, Question } from "./question.types"

type UseFormRuntimeOptions = {
  questions: Question[]
  flow: Flow
  data?: Record<string, unknown>
}

export function useFormRuntime({
  questions,
  flow,
  data = {},
}: UseFormRuntimeOptions) {
  const questionsById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  )

  const [currentStepId, setCurrentStepId] = useState<StepId>(flow.start)
  const [answers, setAnswers] = useState<Answers>({})
  const [isDone, setIsDone] = useState(false)

  // Refs mirror the state so that answering and advancing within the same
  // event handler sees the fresh values instead of the render's closure.
  const answersRef = useRef<Answers>({})
  const stepRef = useRef<StepId>(flow.start)

  const currentStep = flow.steps[currentStepId]

  const currentQuestions = useMemo(() => {
    if (!currentStep) return []

    if (currentStep.kind === "question") {
      const question = questionsById.get(currentStep.id)
      return question ? [question] : []
    }

    if (currentStep.kind === "screen") {
      return currentStep.ids.flatMap((id) => {
        const question = questionsById.get(id)
        return question ? [question] : []
      })
    }

    return []
  }, [currentStep, questionsById])

  const answer = useCallback((id: string, value: unknown) => {
    answersRef.current = { ...answersRef.current, [id]: value }
    setAnswers(answersRef.current)
  }, [])

  const advance = useCallback(async () => {
    const destination = flow.next(stepRef.current, answersRef.current, {
      firstTryCorrect: {},
      data,
    })

    if (destination === "done") {
      setIsDone(true)
      return
    }

    stepRef.current = destination
    setCurrentStepId(destination)
  }, [flow, data])

  return {
    currentStep,
    currentStepId,
    currentQuestions,
    answers,
    isDone,
    answer,
    advance,
  }
}
