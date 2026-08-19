import type { ReactNode } from "react"
import type { CommitFn } from "./commit.types"
import type { Answers } from "./question.types"

export type StepId = string

export type Step =
  | { kind: "question"; id: string }
  | { kind: "screen"; ids: string[] }
  | { kind: "content"; render: ReactNode }
  | { kind: "commit"; run: CommitFn }

export type FlowContext = {
  /**
   * Whether each question was answered correctly on the first attempt.
   * Populated by the runtime, read by `next` — a flow can only branch on
   * early mistakes because a wrong answer never advances past its question.
   */
  firstTryCorrect: Record<string, boolean>
  data: Record<string, unknown>
}

export type Flow = {
  start: StepId
  steps: Record<StepId, Step>
  /**
   * Called to advance the run and, on every render, to project how long the run
   * will be — so it must be free of side effects, and must read a missing
   * `firstTryCorrect` entry as "did not stumble". A flow that branches the other
   * way would announce the branch before the person reached it.
   */
  next: (
    current: StepId,
    answers: Answers,
    context: FlowContext,
  ) => StepId | "done"
}
