import type { CommitFn } from "~/components/forms/runtime/commit.types"
import type { Flow, StepId } from "~/components/forms/runtime/flow.types"
import type { Question } from "~/components/forms/runtime/question.types"

const SCREEN: StepId = "evento"
const COMMIT: StepId = "salvar"

/**
 * Every field on one screen, then a single save. This is the form an admin
 * fills in every few weeks and reads far more often than that: the whole event
 * has to be in front of them, not doled out a question at a time.
 */
export function buildEventFlow(questions: Question[], commit: CommitFn): Flow {
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
