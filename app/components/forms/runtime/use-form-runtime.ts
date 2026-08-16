import { useCallback, useMemo, useRef, useState } from "react"
import type { CommitResult } from "./commit.types"
import type { Flow, Step, StepId } from "./flow.types"
import type { Answers, Question } from "./question.types"
import { validateQuestion } from "./validate-question"

const COMMIT_FAILURE_MESSAGE = "Não foi possível salvar agora. Tente novamente."

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

function stepOwning(
  questionId: string,
  steps: Record<StepId, Step>,
): StepId | undefined {
  return Object.keys(steps).find((stepId) => {
    const step = steps[stepId]
    if (step.kind === "question") return step.id === questionId
    if (step.kind === "screen") return step.ids.includes(questionId)
    return false
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
  const [firstTryCorrect, setFirstTryCorrect] = useState<
    Record<string, boolean>
  >({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)

  // Refs mirror the state so that answering and advancing within the same
  // event handler sees the fresh values instead of the render's closure.
  const answersRef = useRef<Answers>({})
  const stepRef = useRef<StepId>(flow.start)
  const firstTryRef = useRef<Record<string, boolean>>({})
  const pendingRef = useRef<string[]>([])

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
    const origin = stepRef.current
    const pending = questionsForStep(flow.steps[origin], questionsById)

    const failures: Record<string, string> = {}
    for (const question of pending) {
      const value = answersRef.current[question.id]
      const result = validateQuestion(question, value)

      // Only a real attempt counts. Advancing with nothing filled in is a
      // misclick, not a wrong answer, and must not sink a branch that keys
      // off first-attempt mistakes.
      const attempted = value !== undefined
      if (attempted && !(question.id in firstTryRef.current)) {
        firstTryRef.current = {
          ...firstTryRef.current,
          [question.id]: result.ok,
        }
      }

      if (!result.ok) {
        failures[question.id] = result.message
      }
    }

    setFirstTryCorrect(firstTryRef.current)

    if (Object.keys(failures).length > 0) {
      setErrors(failures)
      return
    }

    setFormError(null)

    // Answering a step clears any rejection the server raised against it. While
    // rejections remain elsewhere, the runtime routes to them instead of
    // following the flow, so a stale rejected answer can never be resubmitted
    // without the person seeing it flagged first. Their messages are kept, or
    // the person would arrive at the question with no idea why they were sent
    // back to it.
    const answeredHere = new Set(pending.map((question) => question.id))
    pendingRef.current = pendingRef.current.filter(
      (id) => !answeredHere.has(id),
    )

    setErrors((current) =>
      Object.fromEntries(
        pendingRef.current
          .filter((id) => current[id])
          .map((id) => [id, current[id]]),
      ),
    )

    const stillPending = pendingRef.current[0]
    if (stillPending) {
      const target = stepOwning(stillPending, flow.steps)
      if (target) {
        stepRef.current = target
        setCurrentStepId(target)
        return
      }
      pendingRef.current = []
    }

    const resolve = (from: StepId) =>
      flow.next(from, answersRef.current, {
        firstTryCorrect: firstTryRef.current,
        data,
      })

    const stayPut = () => {
      setFormError(COMMIT_FAILURE_MESSAGE)
      stepRef.current = origin
      setCurrentStepId(origin)
    }

    let destination = resolve(origin)

    // Commit steps have nothing to render, so the runtime runs them and keeps
    // resolving until it reaches a step the person can actually see.
    while (destination !== "done") {
      const step = flow.steps[destination]

      if (!step) {
        if (process.env.NODE_ENV !== "production") {
          console.error(
            `[form-runtime] flow.next returned "${destination}", which is not a step in this flow.`,
          )
        }
        return
      }

      if (step.kind !== "commit") break

      let result: CommitResult
      try {
        result = await step.run(answersRef.current)
      } catch {
        stayPut()
        return
      }

      if (result.ok) {
        stepRef.current = destination
        destination = resolve(destination)
        continue
      }

      const rejected: Record<string, string> = {}
      for (const error of result.errors) {
        rejected[error.questionId] = error.message
      }
      setErrors(rejected)

      const first = result.errors[0]
      const target = first
        ? stepOwning(first.questionId, flow.steps)
        : undefined

      if (!target) {
        stayPut()
        return
      }

      pendingRef.current = result.errors.map((error) => error.questionId)
      stepRef.current = target
      setCurrentStepId(target)
      return
    }

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
    formError,
    firstTryCorrect,
    isDone,
    answer,
    advance,
  }
}
