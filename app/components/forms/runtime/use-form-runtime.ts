import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ENV } from "varlock/env"
import { formRuntimeCopy } from "~/copy/forms"
import type { CommitResult } from "~types/forms/commit.types"
import type { Flow, Step, StepId } from "./flow.types"
import {
  clearRuntimeState,
  readKeepOnDone,
  readRuntimeState,
  runtimeStorageKey,
  writeRuntimeState,
} from "./persistence"
import { projectPath } from "./project-path"
import type { Answers, Question } from "./question.types"
import { asAnsweredValues, validateQuestion } from "./validate-question"

// Shared so a caller with no data of its own does not sink every memo that
// reads it with a fresh object each render.
const NO_DATA: Record<string, unknown> = {}

type UseFormRuntimeOptions = {
  questions: Question[]
  flow: Flow
  data?: Record<string, unknown>
  /**
   * Answers the run opens with — a profile being corrected, typically. Seeded
   * once, so a caller building the object inline does not undo what someone has
   * typed since. A stored run wins over it, being closer to where they are.
   */
  initialAnswers?: Answers
  /**
   * Where the caller believes the run is — a url, typically. Honoured only for
   * a step whose questions are all answered, so it cannot skip past one.
   */
  stepId?: StepId
  /** Keeps the run alive across a refresh. Without it, memory only. */
  persistence?: { formId: string; scopeId: string }
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
  data = NO_DATA,
  initialAnswers,
  persistence,
  stepId,
}: UseFormRuntimeOptions) {
  const questionsById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  )

  const canShow = (id: StepId | undefined, answers: Answers) => {
    if (!id) return false

    const step = flow.steps[id]
    if (!step) return false

    const asked =
      step.kind === "question"
        ? [step.id]
        : step.kind === "screen"
          ? step.ids
          : []

    return (
      asked.length > 0 && asked.every((question) => answers[question] !== undefined)
    )
  }

  const storageKey = persistence
    ? runtimeStorageKey(persistence.formId, persistence.scopeId)
    : null

  const [currentStepId, setCurrentStepId] = useState<StepId>(flow.start)
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [firstTryCorrect, setFirstTryCorrect] = useState<
    Record<string, boolean>
  >({})
  const [formError, setFormError] = useState<string | null>(null)

  // Which questions refused the last attempt to move on. A new object per
  // refusal, even for the same questions, so an effect keyed on it fires again.
  const [advanceRejection, setAdvanceRejection] = useState<{
    questionIds: string[]
  } | null>(null)

  const [isBusy, setIsBusy] = useState(false)
  const [isDone, setIsDone] = useState(false)

  // Which way the run last moved, for a caller mirroring the step in a history
  // that should not grow while someone walks backwards through it.
  const [lastMove, setLastMove] = useState<"forward" | "back">("forward")

  // False on the server too, so the first client render matches the markup it
  // hydrates.
  const [isRestored, setIsRestored] = useState(!storageKey)

  // Refs mirror the state so answering and advancing in one handler sees fresh
  // values rather than the render's closure.
  const answersRef = useRef<Answers>(initialAnswers ?? {})
  const stepRef = useRef<StepId>(flow.start)
  const firstTryRef = useRef<Record<string, boolean>>({})
  const pendingRef = useRef<string[]>([])
  const runningRef = useRef(false)
  const restoredRef = useRef(false)

  const currentStep = flow.steps[currentStepId]

  useEffect(() => {
    if (!storageKey || restoredRef.current) return
    restoredRef.current = true

    const stored = readRuntimeState(storageKey)

    // A step the flow no longer has means the record predates a change to it.
    if (stored && !flow.steps[stored.currentStepId]) {
      clearRuntimeState(storageKey)
    } else if (stored) {
      answersRef.current = stored.answers
      firstTryRef.current = stored.firstTryCorrect
      setAnswers(stored.answers)
      setFirstTryCorrect(stored.firstTryCorrect)

      const resumed = canShow(stepId, stored.answers)
        ? (stepId as StepId)
        : stored.currentStepId

      stepRef.current = resumed
      setCurrentStepId(resumed)
    }

    setIsRestored(true)
  }, [storageKey, flow])

  useEffect(() => {
    if (!storageKey || !isRestored || isDone) return

    writeRuntimeState(storageKey, { answers, currentStepId, firstTryCorrect })
  }, [
    storageKey,
    isRestored,
    isDone,
    answers,
    currentStepId,
    firstTryCorrect,
  ])

  // After the write above, so a commit that finishes leaves nothing behind.
  useEffect(() => {
    if (!storageKey || !isDone) return

    // Read at completion, so a flag added part way through the run still counts.
    if (readKeepOnDone(storageKey)) return

    clearRuntimeState(storageKey)
  }, [storageKey, isDone])

  // The browser's back button, mirrored in the url, arrives here as a changed
  // stepId. Which is why a caller mirroring the current step must not hand that
  // mirror straight back: a request to return and an echo of the step just left
  // are indistinguishable here, and both would be obeyed. See
  // `event-rules-page.tsx`.
  useEffect(() => {
    if (!stepId || stepId === stepRef.current) return
    if (!canShow(stepId, answersRef.current)) return

    stepRef.current = stepId
    setCurrentStepId(stepId)
    // Only the caller's request belongs here: answers and flow are read for the
    // decision, not watched for one.
  }, [stepId])

  const currentQuestions = useMemo(
    () => questionsForStep(currentStep, questionsById),
    [currentStep, questionsById],
  )

  // Projected from what is known now, so it revises as answers arrive. Commit
  // steps are dropped because nobody ever sees one.
  const path = useMemo(
    () =>
      projectPath(flow, answers, { firstTryCorrect, data }).filter(
        (id) => flow.steps[id]?.kind !== "commit",
      ),
    [flow, answers, firstTryCorrect, data],
  )

  const position = path.indexOf(currentStepId)

  const progress = useMemo(() => {
    if (path.length <= 1 || position < 0) return null

    return { index: position + 1, total: path.length }
  }, [path, position])

  // The same projection read backwards.
  const previousStepId = position > 0 ? path[position - 1] : undefined

  const answer = useCallback((id: string, value: unknown) => {
    answersRef.current = { ...answersRef.current, [id]: value }
    setAnswers(answersRef.current)

    // The message described the answer that was there; left up while someone
    // picks a new one it reads as "still wrong".
    setErrors((current) => {
      if (!(id in current)) return current

      const { [id]: _cleared, ...rest } = current
      return rest
    })
  }, [])

  // Walking back validates nothing — the answers stay as they are. What goes is
  // the failure belonging to the step being left, which says nothing about the
  // one before it.
  const goBack = useCallback(() => {
    if (runningRef.current || isDone || !previousStepId) return

    setLastMove("back")
    setFormError(null)
    setAdvanceRejection(null)
    stepRef.current = previousStepId
    setCurrentStepId(previousStepId)
  }, [isDone, previousStepId])

  const runAdvance = useCallback(async () => {
    setLastMove("forward")

    const origin = stepRef.current
    const pending = questionsForStep(flow.steps[origin], questionsById)

    // A refine may read another question's answer, so it gets the run as those
    // questions read it rather than raw.
    const values = asAnsweredValues(questionsById.values(), answersRef.current)

    const failures: Record<string, string> = {}
    for (const question of pending) {
      const value = answersRef.current[question.id]
      const result = validateQuestion(question, value, values)

      // Advancing with nothing filled in is a misclick, not a wrong answer, and
      // must not sink a branch keyed off first-attempt mistakes.
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

    const answeredHere = new Set(pending.map((question) => question.id))

    // Only this step's errors are replaced, so a question the server rejected
    // elsewhere keeps the reason until someone reaches it.
    const elsewhere = (current: Record<string, string>) =>
      Object.fromEntries(
        pendingRef.current
          .filter((id) => !answeredHere.has(id) && current[id])
          .map((id) => [id, current[id]]),
      )

    // The rejection travels with the errors it refers to, here and in the commit
    // branch below: `RejectionNotice` reads both to pick a field, and one
    // landing a render early points it at a message that is not there yet.
    if (Object.keys(failures).length > 0) {
      setErrors((current) => ({ ...elsewhere(current), ...failures }))
      setAdvanceRejection({
        // Off the step, not off `failures`, whose keys a digit-only id would
        // reorder — and the first of these is where focus goes.
        questionIds: pending
          .map((question) => question.id)
          .filter((id) => id in failures),
      })
      return
    }

    setFormError(null)
    setAdvanceRejection(null)

    pendingRef.current = pendingRef.current.filter(
      (id) => !answeredHere.has(id),
    )

    setErrors(elsewhere)

    const stillPending = pendingRef.current[0]
    if (stillPending) {
      const target = stepOwning(stillPending, flow.steps)
      if (target) {
        stepRef.current = target
        setCurrentStepId(target)
        return
      }

      if (ENV.NODE_ENV !== "production") {
        console.error(
          `[form-runtime] a commit rejected "${stillPending}", which no step in this flow asks.`,
        )
      }
      pendingRef.current = []
    }

    const resolve = (from: StepId) =>
      flow.next(from, answersRef.current, {
        firstTryCorrect: firstTryRef.current,
        data,
      })

    const stayPut = (reason?: string) => {
      setFormError(reason ?? formRuntimeCopy.commitFailed)
      stepRef.current = origin
      setCurrentStepId(origin)
    }

    let destination = resolve(origin)

    // Commit steps have nothing to render, so keep resolving until a visible one.
    while (destination !== "done") {
      const step = flow.steps[destination]

      if (!step) {
        if (ENV.NODE_ENV !== "production") {
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
      } catch (thrown) {
        // Without this a run that stops moving reads as a stuck form rather than
        // as a failed request.
        if (ENV.NODE_ENV !== "production") {
          console.error("[form-runtime] a commit threw.", thrown)
        }

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
        stayPut(result.message)
        return
      }

      pendingRef.current = result.errors.map((error) => error.questionId)
      setAdvanceRejection({ questionIds: pendingRef.current })
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

  // Commits here register people for events, so a second Enter while one is in
  // flight must not submit twice.
  const advance = useCallback(async () => {
    if (runningRef.current) return

    runningRef.current = true
    setIsBusy(true)
    try {
      await runAdvance()
    } finally {
      runningRef.current = false
      setIsBusy(false)
    }
  }, [runAdvance])

  return {
    currentStep,
    currentStepId,
    currentQuestions,
    answers,
    errors,
    formError,
    advanceRejection,
    firstTryCorrect,
    isBusy,
    isDone,
    isRestored,
    lastMove,
    progress,
    canGoBack: previousStepId !== undefined,
    answer,
    advance,
    goBack,
  }
}
