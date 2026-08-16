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
  next: (
    current: StepId,
    answers: Answers,
    context: FlowContext,
  ) => StepId | "done"
}
