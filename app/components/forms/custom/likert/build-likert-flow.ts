import type { CommitFn } from "~/components/forms/runtime/commit.types"
import type { Flow, Step } from "~/components/forms/runtime/flow.types"
import type { Question } from "~/components/forms/runtime/question.types"

// A colon never appears in a statement key, so the save cannot be mistaken
// for a statement — in the flow or in a draft restored after a refresh.
export const LIKERT_COMMIT_STEP = ":commit"

export function buildLikertFlow(questions: Question[], commit: CommitFn): Flow {
  const ids = questions.map((question) => question.id)

  const steps: Record<string, Step> = Object.fromEntries(
    ids.map((id) => [id, { kind: "question", id } satisfies Step]),
  )
  steps[LIKERT_COMMIT_STEP] = { kind: "commit", run: commit }

  return {
    start: ids[0] ?? LIKERT_COMMIT_STEP,
    steps,
    next: (current) => {
      if (current === LIKERT_COMMIT_STEP) return "done"
      return ids[ids.indexOf(current) + 1] ?? LIKERT_COMMIT_STEP
    },
  }
}
