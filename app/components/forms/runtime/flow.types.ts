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
   * Whether each question was right on the first attempt. Written by the
   * runtime, read by `next` — and only early mistakes can be branched on,
   * because a wrong answer never advances past its question.
   */
  firstTryCorrect: Record<string, boolean>
  data: Record<string, unknown>
}

export type Flow = {
  start: StepId
  steps: Record<StepId, Step>
  /**
   * Called to advance the run and, on every render, to project its length — so
   * no side effects, and a missing `firstTryCorrect` entry has to read as "did
   * not stumble", or the branch is announced before anyone reaches it.
   */
  next: (
    current: StepId,
    answers: Answers,
    context: FlowContext,
  ) => StepId | "done"
}
