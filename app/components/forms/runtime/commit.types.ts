import type { CommitResult } from "~types/forms/commit.types"
import type { Answers } from "./question.types"

export type CommitFn = (
  answers: Answers,
) => CommitResult | Promise<CommitResult>
