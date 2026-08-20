import type { Flow, FlowContext, StepId } from "./flow.types"
import type { Answers } from "./question.types"

/**
 * The steps the flow would walk from its start, given what is known so far.
 *
 * A question nobody has reached has no entry in `firstTryCorrect`, and a flow
 * reads that absence as "did not stumble" — so the projection follows the
 * shortest path until a real mistake lengthens it. Every flow branching on
 * first attempts must keep that contract, or this count will not match the run.
 *
 * The loop and missing-step stops are guards; the runtime reports the same
 * failure at advance time.
 */
export function projectPath(
  flow: Flow,
  answers: Answers,
  context: FlowContext,
): StepId[] {
  const path: StepId[] = []
  const seen = new Set<StepId>()

  let current: StepId | "done" = flow.start

  while (current !== "done" && flow.steps[current] && !seen.has(current)) {
    seen.add(current)
    path.push(current)
    current = flow.next(current, answers, context)
  }

  return path
}
