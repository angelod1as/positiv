import type { RulesDeal } from "./build-rules-questions"

/**
 * How a run was dealt — questions in the order they are asked, answers in the
 * order they are laid out — kept for as long as the run it belongs to.
 *
 * The quiz is shuffled so that nobody learns it by position, and the runtime
 * persists the answers and the step across a refresh. But a step is a question
 * id, and a fresh shuffle puts that id somewhere else: without this, a refresh
 * dealt the quiz again underneath the reader, the progress count moved with it
 * — "1 de 14" then "6 de 14" on the same question — and the alternatives
 * swapped places under a question that had not changed.
 *
 * Session storage, like the runtime's own record, so both die with the tab.
 */
const key = (eventId: string) => `rules-order:${eventId}`

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((id) => typeof id === "string")

function isDeal(value: unknown): value is RulesDeal {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const { questions, options } = value as Record<string, unknown>

  if (!isIdList(questions)) return false

  if (typeof options !== "object" || options === null || Array.isArray(options)) {
    return false
  }

  return Object.values(options).every(isIdList)
}

export function readRulesDeal(eventId: string): RulesDeal | null {
  if (typeof window === "undefined") return null

  try {
    const raw = sessionStorage.getItem(key(eventId))
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)

    return isDeal(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeRulesDeal(eventId: string, deal: RulesDeal): void {
  if (typeof window === "undefined") return

  try {
    sessionStorage.setItem(key(eventId), JSON.stringify(deal))
  } catch {
    // Storage unavailable: the run keeps the deal it holds in memory, and a
    // refresh deals again — which is where this started.
  }
}

export function clearRulesDeal(eventId: string): void {
  if (typeof window === "undefined") return

  try {
    sessionStorage.removeItem(key(eventId))
  } catch {
    // Storage unavailable: nothing was ever written to remove.
  }
}
