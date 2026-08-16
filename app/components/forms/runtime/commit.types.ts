import type { Answers } from "./question.types"

export type CommitError = {
  questionId: string
  message: string
}

export type CommitResult = { ok: true } | { ok: false; errors: CommitError[] }

export type CommitFn = (
  answers: Answers,
) => CommitResult | Promise<CommitResult>
