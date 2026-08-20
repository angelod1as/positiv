import type { CommitFn } from "./commit.types"
import type { Flow, StepId } from "./flow.types"
import type { Question } from "./question.types"

const SCREEN: StepId = "screen"
const COMMIT: StepId = "commit"

/**
 * Every question on one screen, then a single save — the shape a short form
 * wants. A login of two fields walked through two screens would be a longer
 * errand than the one it replaced, and the runtime serves both readings of a
 * form from the same questions.
 */
export function buildSingleScreenFlow(
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
    next: (current) => (current === SCREEN ? COMMIT : "done"),
  }
}
