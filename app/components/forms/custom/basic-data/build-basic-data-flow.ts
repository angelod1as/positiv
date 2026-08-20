import type { CommitFn } from "~/components/forms/runtime/commit.types"
import type { Flow, StepId } from "~/components/forms/runtime/flow.types"
import type { Question } from "~/components/forms/runtime/question.types"

const SCREEN: StepId = "dados"
const COMMIT: StepId = "salvar"

/**
 * Every field on one screen, then a single save. These are things someone
 * already knows about themselves, and the two screens they used to be split
 * across only made the errand look longer than it is.
 */
export function buildBasicDataFlow(
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
