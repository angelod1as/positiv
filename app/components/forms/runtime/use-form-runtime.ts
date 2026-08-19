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

// Shared so that a caller with no data to give does not hand the hook a new
// object on every render, which would sink every memo that reads it.
const NO_DATA: Record<string, unknown> = {}

type UseFormRuntimeOptions = {
  questions: Question[]
  flow: Flow
  data?: Record<string, unknown>
  /**
   * Where the caller believes the run is — a url, typically. Honoured only for
   * a step whose questions are all answered, so that it walks back through the
   * flow without opening a way to skip past a question.
   */
  stepId?: StepId
  /**
   * Keeps the run alive across a refresh. Without it the runtime holds
   * everything in memory, which is what a form with nothing to lose wants.
   */
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
  const [answers, setAnswers] = useState<Answers>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [firstTryCorrect, setFirstTryCorrect] = useState<
    Record<string, boolean>
  >({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [isDone, setIsDone] = useState(false)

  // Starts false on the server as well, so the first client render matches the
  // markup it hydrates. Reading storage during render would be the very
  // mismatch this exists to avoid.
  const [isRestored, setIsRestored] = useState(!storageKey)

  // Refs mirror the state so that answering and advancing within the same
  // event handler sees the fresh values instead of the render's closure.
  const answersRef = useRef<Answers>({})
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

    // A step the flow no longer has means the flow changed under a record
    // written by an older shape of it. Nothing there is trustworthy.
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

  // Declared after the write above so that a commit turning isDone true leaves
  // nothing behind: the write bails on isDone, this one removes the record.
  useEffect(() => {
    if (!storageKey || !isDone) return

    // Read at completion time rather than at mount, so that adding the flag
    // part way through a run still counts.
    if (readKeepOnDone(storageKey)) return

    clearRuntimeState(storageKey)
  }, [storageKey, isDone])

  // The caller can move the run itself — the browser's back button, mirrored in
  // the url, arrives here as a changed stepId.
  //
  // Which is why a caller that mirrors the current step in the url must not
  // hand that mirror straight back: this effect cannot tell a reader asking to
  // return to a question from an echo of the question the run just left, and
  // would obey both. See `event-rules-page.tsx`, which keeps the last step the
  // reader asked for rather than passing every url change through.
  useEffect(() => {
    if (!stepId || stepId === stepRef.current) return
    if (!canShow(stepId, answersRef.current)) return

    stepRef.current = stepId
    setCurrentStepId(stepId)
    // Only the caller's request belongs here: answers and flow are read for the
    // decision, but a change in either is not a reason to move anyone.
  }, [stepId])

  const currentQuestions = useMemo(
    () => questionsForStep(currentStep, questionsById),
    [currentStep, questionsById],
  )

  // Projected from what is known now, so it revises as answers arrive: a flow
  // that branches on an early mistake looks short until the mistake happens.
  // Commit steps are dropped because nobody ever sees one.
  const progress = useMemo(() => {
    const path = projectPath(flow, answers, { firstTryCorrect, data }).filter(
      (id) => flow.steps[id]?.kind !== "commit",
    )

    if (path.length <= 1) return null

    const position = path.indexOf(currentStepId)
    if (position < 0) return null

    return { index: position + 1, total: path.length }
  }, [flow, answers, firstTryCorrect, data, currentStepId])

  const answer = useCallback((id: string, value: unknown) => {
    answersRef.current = { ...answersRef.current, [id]: value }
    setAnswers(answersRef.current)

    // The message described the answer that was there. Leaving it up while the
    // person picks a new one reads as "still wrong", and sends them clicking
    // the button again to find out.
    setErrors((current) => {
      if (!(id in current)) return current

      const { [id]: _cleared, ...rest } = current
      return rest
    })
  }, [])

  const runAdvance = useCallback(async () => {
    const origin = stepRef.current
    const pending = questionsForStep(flow.steps[origin], questionsById)

    // A refine may read an answer belonging to another question, so it is
    // handed the run as those questions read it rather than raw.
    const values = asAnsweredValues(questionsById.values(), answersRef.current)

    const failures: Record<string, string> = {}
    for (const question of pending) {
      const value = answersRef.current[question.id]
      const result = validateQuestion(question, value, values)

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

    const answeredHere = new Set(pending.map((question) => question.id))

    // Rejections the server raised against other steps outlive whatever happens
    // on this one. Only the current step's own errors are replaced, so a
    // corrected answer loses its message while a question waiting elsewhere
    // keeps the reason the person will need when they get there.
    const elsewhere = (current: Record<string, string>) =>
      Object.fromEntries(
        pendingRef.current
          .filter((id) => !answeredHere.has(id) && current[id])
          .map((id) => [id, current[id]]),
      )

    if (Object.keys(failures).length > 0) {
      setErrors((current) => ({ ...elsewhere(current), ...failures }))
      return
    }

    setFormError(null)

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

    const stayPut = () => {
      setFormError(formRuntimeCopy.commitFailed)
      stepRef.current = origin
      setCurrentStepId(origin)
    }

    let destination = resolve(origin)

    // Commit steps have nothing to render, so the runtime runs them and keeps
    // resolving until it reaches a step the person can actually see.
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
        // The person sees "could not save"; whoever is debugging sees nothing
        // at all, and a run that simply stops moving reads as a stuck form
        // rather than as a failed request.
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

  // A commit can be a real network call, and this app's commits register people
  // for events. A second Enter or click while one is in flight must not submit
  // twice.
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
    firstTryCorrect,
    isBusy,
    isDone,
    isRestored,
    progress,
    answer,
    advance,
  }
}
