import type { CommitFn } from "~/components/forms/runtime/commit.types"
import type { Flow, Step, StepId } from "~/components/forms/runtime/flow.types"
import type { Question } from "~/components/forms/runtime/question.types"

const FORM: StepId = "form"
const COMMIT: StepId = "commit"

/**
 * One screen holding every question, then the save. The quiz is what asks one
 * thing at a time; this form is five fields somebody fills in one sitting, and
 * splitting it would be a change nobody asked for.
 */
export function buildApplicationFlow(
  questions: Question[],
  commit: CommitFn,
): Flow {
  const steps: Record<StepId, Step> = {
    [FORM]: { kind: "screen", ids: questions.map((question) => question.id) },
    [COMMIT]: { kind: "commit", run: commit },
  }

  return {
    start: FORM,
    steps,
    next: (current) => (current === COMMIT ? "done" : COMMIT),
  }
}
