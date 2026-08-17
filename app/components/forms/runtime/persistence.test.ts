import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearRuntimeState,
  readKeepOnDone,
  readRuntimeState,
  runtimeStorageKey,
  writeRuntimeState,
} from "./persistence"

const key = runtimeStorageKey("quiz", "evento-1")

const state = {
  answers: { nome: "Ana" },
  currentStepId: "cidade",
  firstTryCorrect: { sonda: false },
}

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("runtimeStorageKey", () => {
  it("keys by form and scope", () => {
    expect(runtimeStorageKey("quiz", "evento-1")).toBe(
      "form-runtime:quiz:evento-1",
    )
  })
})

describe("readRuntimeState", () => {
  it("reads back what was written", () => {
    writeRuntimeState(key, state)

    expect(readRuntimeState(key)).toEqual(state)
  })

  it("returns null when nothing was written", () => {
    expect(readRuntimeState(key)).toBeNull()
  })

  it("discards a record written by another version", () => {
    sessionStorage.setItem(key, JSON.stringify({ v: 99, ...state }))

    expect(readRuntimeState(key)).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it("discards a record that is not valid JSON", () => {
    sessionStorage.setItem(key, "{ not json")

    expect(readRuntimeState(key)).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it("discards a record whose shape does not hold", () => {
    sessionStorage.setItem(key, JSON.stringify({ v: 1, answers: "nope" }))

    expect(readRuntimeState(key)).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  // A flag pasted in before the flow starts has no state beside it, and
  // discarding it as malformed would defeat the point of pasting it.
  it("leaves a flag-only record in place", () => {
    sessionStorage.setItem(key, JSON.stringify({ v: 1, keepOnDone: true }))

    expect(readRuntimeState(key)).toBeNull()
    expect(readKeepOnDone(key)).toBe(true)
  })

  it("returns null instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled")
    })

    expect(() => readRuntimeState(key)).not.toThrow()
    expect(readRuntimeState(key)).toBeNull()
  })
})

describe("writeRuntimeState", () => {
  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded")
    })

    expect(() => writeRuntimeState(key, state)).not.toThrow()
  })

  it("carries an existing keepOnDone forward", () => {
    sessionStorage.setItem(key, JSON.stringify({ v: 1, keepOnDone: true }))

    writeRuntimeState(key, state)

    expect(readKeepOnDone(key)).toBe(true)
  })
})

describe("clearRuntimeState", () => {
  it("removes the record", () => {
    writeRuntimeState(key, state)

    clearRuntimeState(key)

    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage disabled")
    })

    expect(() => clearRuntimeState(key)).not.toThrow()
  })
})

describe("readKeepOnDone", () => {
  it("is false when no record exists", () => {
    expect(readKeepOnDone(key)).toBe(false)
  })

  it("is false when the record does not ask for it", () => {
    writeRuntimeState(key, state)

    expect(readKeepOnDone(key)).toBe(false)
  })

  // Someone pasting the flag in before starting the flow has no answers to
  // write alongside it, so the flag cannot depend on the rest of the shape.
  it("is true for a record holding nothing but the flag", () => {
    sessionStorage.setItem(key, JSON.stringify({ v: 1, keepOnDone: true }))

    expect(readKeepOnDone(key)).toBe(true)
  })

  it("ignores a flag written by another version", () => {
    sessionStorage.setItem(key, JSON.stringify({ v: 99, keepOnDone: true }))

    expect(readKeepOnDone(key)).toBe(false)
  })

  it("is false instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled")
    })

    expect(readKeepOnDone(key)).toBe(false)
  })
})
