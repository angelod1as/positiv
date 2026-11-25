import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearLikertOrder,
  likertOrder,
  readLikertOrder,
  shuffle,
  writeLikertOrder,
} from "./likert-order"

const keys = ["a", "b", "c", "d"]
const reversed = (items: string[]) => [...items].reverse()

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("likertOrder", () => {
  it("shuffles the statements on a first visit", () => {
    expect(likertOrder(keys, null, new Set(), reversed)).toEqual([
      "d",
      "c",
      "b",
      "a",
    ])
  })

  it("keeps the order a run already started with", () => {
    expect(
      likertOrder(keys, ["c", "a", "d", "b"], new Set(["c"]), reversed),
    ).toEqual(["c", "a", "d", "b"])
  })

  it("puts the answered statements first, in the order they were met", () => {
    expect(
      likertOrder(keys, ["c", "a", "d", "b"], new Set(["d", "c"]), reversed),
    ).toEqual(["c", "d", "a", "b"])
  })

  it("starts a fresh shuffle when the kept order is for other statements", () => {
    expect(likertOrder(keys, ["a", "b", "x"], new Set(), reversed)).toEqual([
      "d",
      "c",
      "b",
      "a",
    ])
  })

  it("starts a fresh shuffle when the kept order repeats a statement", () => {
    expect(
      likertOrder(keys, ["a", "a", "b", "c"], new Set(), reversed),
    ).toEqual(["d", "c", "b", "a"])
  })
})

describe("shuffle", () => {
  it("keeps every statement exactly once", () => {
    expect([...shuffle(keys)].sort()).toEqual(keys)
  })

  it("leaves the input alone", () => {
    const input = [...keys]

    shuffle(input)

    expect(input).toEqual(keys)
  })

  it("draws the order from chance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    expect(shuffle(keys)).toEqual(["b", "c", "d", "a"])
  })
})

describe("kept order", () => {
  it("reads back what was written for the same run", () => {
    writeLikertOrder("scope-1", ["b", "a"])

    expect(readLikertOrder("scope-1")).toEqual(["b", "a"])
    expect(readLikertOrder("scope-2")).toBeNull()
  })

  it("is gone once cleared", () => {
    writeLikertOrder("scope-1", ["b", "a"])

    clearLikertOrder("scope-1")

    expect(readLikertOrder("scope-1")).toBeNull()
  })

  it("reads nothing from a record that is not a list of keys", () => {
    localStorage.setItem("likert-order:scope-1", '{"a":1}')

    expect(readLikertOrder("scope-1")).toBeNull()
  })

  it("reads nothing instead of throwing when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled")
    })

    expect(readLikertOrder("scope-1")).toBeNull()
  })
})
