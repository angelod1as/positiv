import type { CommitFn } from "~/components/forms/runtime/commit.types"
import type { Flow, StepId } from "~/components/forms/runtime/flow.types"
import type { Question } from "~/components/forms/runtime/question.types"

const SCREEN: StepId = "register"
const COMMIT: StepId = "commit"

/**
 * Every field on one screen, then a single save. Signing up is five short
 * answers someone already has in their head; walking them through five screens
 * would only make it longer.
 */
export function buildRegisterFlow(
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
