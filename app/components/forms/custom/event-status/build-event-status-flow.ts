import type { CommitFn } from "~/components/forms/runtime/commit.types"
import type { Flow, StepId } from "~/components/forms/runtime/flow.types"
import type { Question } from "~/components/forms/runtime/question.types"

const SCREEN: StepId = "status"
const COMMIT: StepId = "salvar"

/**
 * A run that never finishes. The status of an event is changed again and again
 * over its life — scheduled, open, closed, completed — and the runtime draws
 * nothing at all once a run is done, so the save leads back to the question
 * rather than to the end.
 */
export function buildEventStatusFlow(
  questions: Question[],
  commit: CommitFn,
): Flow {
  return {
    start: SCREEN,
    steps: {
      [SCREEN]: {
        kind: "screen",
        ids: questions.map((question) => question.id),
      },
      [COMMIT]: { kind: "commit", run: commit },
    },
    next: (current) => (current === SCREEN ? COMMIT : SCREEN),
  }
}
