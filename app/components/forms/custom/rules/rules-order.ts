/**
 * The order the quiz was dealt in, kept for as long as the run it belongs to.
 *
 * The questions are shuffled so that nobody learns the quiz by position, and
 * the runtime persists the answers and the step across a refresh — but a step
 * is a question id, and a fresh shuffle puts that id somewhere else. Without
 * this, a refresh dealt the remaining questions again underneath the reader,
 * and the progress count moved with it: same question, "1 de 14" then "6 de 14".
 *
 * Session storage, like the runtime's own record, so both die with the tab.
 */
const key = (eventId: string) => `rules-order:${eventId}`

const isOrder = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((id) => typeof id === "string")

export function readRulesOrder(eventId: string): string[] | null {
  if (typeof window === "undefined") return null

  try {
    const raw = sessionStorage.getItem(key(eventId))
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)

    return isOrder(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeRulesOrder(eventId: string, order: string[]): void {
  if (typeof window === "undefined") return

  try {
    sessionStorage.setItem(key(eventId), JSON.stringify(order))
  } catch {
    // Storage unavailable: the run keeps the order it holds in memory, and a
    // refresh deals again — which is where this started.
  }
}

export function clearRulesOrder(eventId: string): void {
  if (typeof window === "undefined") return

  try {
    sessionStorage.removeItem(key(eventId))
  } catch {
    // Storage unavailable: nothing was ever written to remove.
  }
}
