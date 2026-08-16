import { useCallback, useMemo, useRef, useState } from "react"
import type { Flow, Step, StepId } from "./flow.types"
import type { Answers, Question } from "./question.types"
import { validateQuestion } from "./validate-question"

type UseFormRuntimeOptions = {
  questions: Question[]
  flow: Flow
  data?: Record<string, unknown>
}

type QuestionsById = Map<string, Question>

function questionsForStep(
  step: Step | undefined,
  questionsById: QuestionsById,
): Question[] {
  if (!step) return []

  const ids =
    step.kind === "question"
      ? [step.id]
      : step.kind === "screen"
        ? step.ids
        : []

  return ids.flatMap((id) => {
    const question = questionsById.get(id)
    return question ? [question] : []
  })
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDone, setIsDone] = useState(false)

  // Refs mirror the state so that answering and advancing within the same
  // event handler sees the fresh values instead of the render's closure.
  const answersRef = useRef<Answers>({})
  const stepRef = useRef<StepId>(flow.start)

  const currentStep = flow.steps[currentStepId]

  const currentQuestions = useMemo(
    () => questionsForStep(currentStep, questionsById),
    [currentStep, questionsById],
  )

  const answer = useCallback((id: string, value: unknown) => {
    answersRef.current = { ...answersRef.current, [id]: value }
    setAnswers(answersRef.current)
  }, [])

  const advance = useCallback(async () => {
    const pending = questionsForStep(flow.steps[stepRef.current], questionsById)

    const failures: Record<string, string> = {}
    for (const question of pending) {
      const result = validateQuestion(question, answersRef.current[question.id])
      if (!result.ok) {
        failures[question.id] = result.message
      }
    }

    if (Object.keys(failures).length > 0) {
      setErrors(failures)
      return
    }

    setErrors({})

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
  }, [flow, questionsById, data])

  return {
    currentStep,
    currentStepId,
    currentQuestions,
    answers,
    errors,
    isDone,
    answer,
    advance,
  }
}
