import { runtimeStorageKey } from "~/components/forms/runtime/persistence"

const ORDER_PREFIX = "likert-order:"
const DRAFT_PREFIX = runtimeStorageKey("likert", "")

const storageKey = (scope: string) => `${ORDER_PREFIX}${scope}`

const isKeyList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((key) => typeof key === "string")

export function shuffle(items: string[]): string[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]
  }

  return shuffled
}

const isOrderOf = (keys: string[], order: string[]) =>
  order.length === keys.length &&
  new Set(order).size === order.length &&
  order.every((key) => keys.includes(key))

/**
 * The order a run asks its statements in: drawn at random once, then kept, so
 * the way back walks the statements in the order they were met. The answered
 * ones go first, which lands someone coming back on the first still waiting.
 */
export function likertOrder(
  keys: string[],
  kept: string[] | null,
  answered: Set<string>,
  draw: (items: string[]) => string[] = shuffle,
): string[] {
  const order = kept && isOrderOf(keys, kept) ? kept : draw(keys)

  return [
    ...order.filter((key) => answered.has(key)),
    ...order.filter((key) => !answered.has(key)),
  ]
}

export function readLikertOrder(scope: string): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey(scope))
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    return isKeyList(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeLikertOrder(scope: string, order: string[]): void {
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(order))
  } catch {
    // Storage unavailable: the order lasts as long as the page does.
  }
}

export function clearLikertOrder(scope: string): void {
  try {
    localStorage.removeItem(storageKey(scope))
  } catch {
    // Storage unavailable: nothing was ever written to remove.
  }
}

/**
 * Removes every Likert draft and order this browser keeps, for whoever signed
 * in here. They outlive the tab, so signing out is the moment they must go.
 */
export function clearLikertDrafts(): void {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    )
    for (const key of keys) {
      if (key?.startsWith(ORDER_PREFIX) || key?.startsWith(DRAFT_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Storage unavailable: nothing was ever written to remove.
  }
}
