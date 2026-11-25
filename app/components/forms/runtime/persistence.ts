import type { StepId } from "./flow.types"
import type { Answers } from "./question.types"

const VERSION = 1

/**
 * Where a run is kept. "session" dies with the tab; "local" outlives it, for a
 * form long enough that someone closes the browser and comes back days later.
 */
export type RuntimeStorage = "session" | "local"

const storageFor = (where: RuntimeStorage): Storage =>
  where === "local" ? localStorage : sessionStorage

export type PersistedRuntimeState = {
  answers: Answers
  currentStepId: StepId
  firstTryCorrect: Record<string, boolean>
}

export function runtimeStorageKey(formId: string, scopeId: string): string {
  return `form-runtime:${formId}:${scopeId}`
}

type Parsed =
  | { kind: "absent" }
  | { kind: "unusable" }
  | { kind: "record"; record: Record<string, unknown> }

function parse(key: string, where: RuntimeStorage): Parsed {
  if (typeof window === "undefined") return { kind: "absent" }

  try {
    const raw = storageFor(where).getItem(key)
    if (!raw) return { kind: "absent" }

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return { kind: "unusable" }

    return { kind: "record", record: parsed as Record<string, unknown> }
  } catch {
    return { kind: "unusable" }
  }
}

// typeof [] is "object", so arrays have to be turned away by name.
const isMap = (value: unknown) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

function holdsState(record: Record<string, unknown>): boolean {
  return (
    isMap(record.answers) &&
    typeof record.currentStepId === "string" &&
    isMap(record.firstTryCorrect)
  )
}

/**
 * Whether the record asks not to be deleted when the flow finishes. Read raw,
 * so pasting `{"v":1,"keepOnDone":true}` in before the flow starts still counts.
 * A version bump drops the flag with the rest of the record, on purpose:
 * carrying anything over from a payload just declared untrustworthy is the hole
 * the version exists to close.
 */
export function readKeepOnDone(
  key: string,
  where: RuntimeStorage = "session",
): boolean {
  const parsed = parse(key, where)

  return (
    parsed.kind === "record" &&
    parsed.record.v === VERSION &&
    parsed.record.keepOnDone === true
  )
}

export function readRuntimeState(
  key: string,
  where: RuntimeStorage = "session",
): PersistedRuntimeState | null {
  const parsed = parse(key, where)
  if (parsed.kind === "absent") return null

  if (parsed.kind === "record") {
    const { record } = parsed

    if (record.v === VERSION && holdsState(record)) {
      return {
        answers: record.answers as Answers,
        currentStepId: record.currentStepId as StepId,
        firstTryCorrect: record.firstTryCorrect as Record<string, boolean>,
      }
    }
  }

  // Unusable, so it goes — unless it is a flag pasted in ahead of the flow.
  if (!readKeepOnDone(key, where)) clearRuntimeState(key, where)

  return null
}

export function writeRuntimeState(
  key: string,
  state: PersistedRuntimeState,
  where: RuntimeStorage = "session",
): void {
  if (typeof window === "undefined") return

  // Read before writing: the flag can be pasted in at any point, and every
  // answer rewrites this record.
  const record: Record<string, unknown> = { v: VERSION, ...state }
  if (readKeepOnDone(key, where)) record.keepOnDone = true

  try {
    storageFor(where).setItem(key, JSON.stringify(record))
  } catch {
    // Storage unavailable: the runtime keeps going from memory.
  }
}

export function clearRuntimeState(
  key: string,
  where: RuntimeStorage = "session",
): void {
  if (typeof window === "undefined") return

  try {
    storageFor(where).removeItem(key)
  } catch {
    // Storage unavailable: nothing was ever written to remove.
  }
}
