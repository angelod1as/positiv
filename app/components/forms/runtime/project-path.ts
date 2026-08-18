import type { Flow, FlowContext, StepId } from "./flow.types"
import type { Answers } from "./question.types"

/**
 * The steps the flow would walk from its start, given what is known so far.
 *
 * A question nobody has reached yet has no entry in `firstTryCorrect`, and a
 * flow reads that absence as "did not stumble" — so the projection follows the
 * shortest path until a real mistake lengthens it. Every flow that branches on
 * first attempts must keep that contract, or the count it produces here will
 * not match the run.
 *
 * Both stops are guards, not behaviour a flow should rely on: a step already
 * walked means the flow loops, and a step the flow does not have means it
 * pointed somewhere broken. The runtime reports the same failure at advance
 * time; here there is nothing to draw past that point either way.
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
