import type { CommitFn } from "~/components/forms/runtime/commit.types"
import type {
  Flow,
  FlowContext,
  Step,
  StepId,
} from "~/components/forms/runtime/flow.types"
import type { Question } from "~/components/forms/runtime/question.types"

const COMMIT: StepId = "commit"

/** "Você... tá legal?" — the one screen a veteran is always asked. */
export const OPENING_QUESTION = "trigger"

const PROBE_COUNT = 2

/** The opening question and the two probes behind it. */
export const SHORT_RUN_LENGTH = PROBE_COUNT + 1

type RulesFlowOptions = {
  /** Someone who has been to a Positiv before, as the server counted it. */
  isVeteran?: boolean
}

// The projection that draws the progress count runs on every render, inside a
// memo with no try/catch, so this reads the context as if it might not be there
// yet rather than trusting the type.
const trippedOn = (context: FlowContext, id: StepId) =>
  (context as Partial<FlowContext>).firstTryCorrect?.[id] === false

/**
 * One screen per question, in the order given, then a single save. The order is
 * whatever the caller shuffled; the flow only walks it.
 *
 * Someone who has been to a Positiv before is asked three questions instead of
 * fourteen: how they are, and two of the rest — whichever two the deal put
 * first, so they change from run to run without anything extra to remember.
 * Getting both of those wrong on the first attempt hands them the whole quiz,
 * with no warning and no screen in between, because per-question validation
 * means "wrong twice" is the only mistake the quiz can still record.
 */
export function buildRulesFlow(
  questions: Question[],
  commit: CommitFn,
  { isVeteran = false }: RulesFlowOptions = {},
): Flow {
  const dealt = questions.map((question) => question.id)

  // A quiz too short to shorten, or one without the opening question, is walked
  // as it was dealt: there would be nothing to save anyone.
  const branches =
    isVeteran && dealt.includes(OPENING_QUESTION) && dealt.length > SHORT_RUN_LENGTH

  const order = branches
    ? [OPENING_QUESTION, ...dealt.filter((id) => id !== OPENING_QUESTION)]
    : dealt

  const probes = order.slice(1, PROBE_COUNT + 1)
  const lastProbe = probes.at(-1)

  const steps: Record<StepId, Step> = {
    [COMMIT]: { kind: "commit", run: commit },
  }

  for (const id of order) {
    steps[id] = { kind: "question", id }
  }

  return {
    start: order[0] ?? COMMIT,
    steps,
    next: (current, _answers, context) => {
      if (current === COMMIT) return "done"

      const next = order[order.indexOf(current) + 1] ?? COMMIT

      if (!branches || current !== lastProbe) return next

      // A question nobody has answered yet has no record, and no record means
      // no stumble — otherwise the count would promise the long quiz to a
      // veteran who has not tripped on anything.
      return probes.every((id) => trippedOn(context, id)) ? next : COMMIT
    },
  }
}
