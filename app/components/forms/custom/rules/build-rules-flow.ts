import type { CommitFn } from "~/components/forms/runtime/commit.types"
import type { Flow, Step, StepId } from "~/components/forms/runtime/flow.types"
import type { Question } from "~/components/forms/runtime/question.types"

const COMMIT: StepId = "commit"

/**
 * One screen per question, in the order given, then a single save. The order is
 * whatever the caller shuffled; the flow only walks it.
 */
export function buildRulesFlow(questions: Question[], commit: CommitFn): Flow {
  const order = questions.map((question) => question.id)

  const steps: Record<StepId, Step> = {
    [COMMIT]: { kind: "commit", run: commit },
  }

  for (const id of order) {
    steps[id] = { kind: "question", id }
  }

  return {
    start: order[0] ?? COMMIT,
    steps,
    next: (current) => {
      if (current === COMMIT) return "done"

      const next = order[order.indexOf(current) + 1]

      return next ?? COMMIT
    },
  }
}
