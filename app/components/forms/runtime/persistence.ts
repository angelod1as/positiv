import type { StepId } from "./flow.types"
import type { Answers } from "./question.types"

const VERSION = 1

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

function parse(key: string): Parsed {
  if (typeof window === "undefined") return { kind: "absent" }

  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return { kind: "absent" }

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return { kind: "unusable" }

    return { kind: "record", record: parsed as Record<string, unknown> }
  } catch {
    return { kind: "unusable" }
  }
}

function holdsState(record: Record<string, unknown>): boolean {
  return (
    typeof record.answers === "object" &&
    record.answers !== null &&
    typeof record.currentStepId === "string" &&
    typeof record.firstTryCorrect === "object" &&
    record.firstTryCorrect !== null
  )
}

/**
 * Whether the record asks not to be deleted when the flow finishes. Read from
 * the raw payload rather than from a restored state, so that pasting
 * `{"v":1,"keepOnDone":true}` in before the flow has started still counts.
 */
export function readKeepOnDone(key: string): boolean {
  const parsed = parse(key)

  return (
    parsed.kind === "record" &&
    parsed.record.v === VERSION &&
    parsed.record.keepOnDone === true
  )
}

export function readRuntimeState(key: string): PersistedRuntimeState | null {
  const parsed = parse(key)
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

  // Unusable, so it goes — unless it is a flag someone pasted in ahead of the
  // flow, which has no state in it yet by design.
  if (!readKeepOnDone(key)) clearRuntimeState(key)

  return null
}

export function writeRuntimeState(
  key: string,
  state: PersistedRuntimeState,
): void {
  if (typeof window === "undefined") return

  // Read before writing: the flag can be pasted in at any point, and every
  // answer rewrites this record.
  const keepOnDone = readKeepOnDone(key)

  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ v: VERSION, ...state, ...(keepOnDone && { keepOnDone }) }),
    )
  } catch {
    // Storage unavailable: the runtime keeps going from memory.
  }
}

export function clearRuntimeState(key: string): void {
  if (typeof window === "undefined") return

  try {
    sessionStorage.removeItem(key)
  } catch {
    // Storage unavailable: nothing was ever written to remove.
  }
}
