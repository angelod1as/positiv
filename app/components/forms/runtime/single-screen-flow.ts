import type { CommitFn } from "./commit.types"
import type { Flow, StepId } from "./flow.types"
import type { Question } from "./question.types"

type SingleScreenFlowOptions = {
  /**
   * What to call the two steps. Worth setting for a form that persists its
   * run: the record names the step it was left on, and a record naming a step
   * the flow no longer has is thrown away — with everything typed into it.
   */
  screenId?: StepId
  commitId?: StepId
}

/**
 * Every question on one screen, then a single save — the shape a short form
 * wants. A login of two fields walked through two screens would be a longer
 * errand than the one it replaced, and the runtime serves both readings of a
 * form from the same questions.
 */
export function buildSingleScreenFlow(
  questions: Question[],
  commit: CommitFn,
  { screenId = "screen", commitId = "commit" }: SingleScreenFlowOptions = {},
): Flow {
  return {
    start: screenId,
    steps: {
      [screenId]: {
        kind: "screen",
        ids: questions.map((question) => question.id),
      },
      [commitId]: { kind: "commit", run: commit },
    },
    next: (current) => (current === screenId ? commitId : "done"),
  }
}
