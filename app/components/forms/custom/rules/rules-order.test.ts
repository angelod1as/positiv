import { beforeEach, describe, expect, it } from "vitest"
import { clearRulesOrder, readRulesOrder, writeRulesOrder } from "./rules-order"

const EVENT = "11111111-1111-4111-8111-111111111111"

describe("rules order", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("has nothing to give before a run has started", () => {
    expect(readRulesOrder(EVENT)).toBeNull()
  })

  it("gives back the order a run was dealt", () => {
    writeRulesOrder(EVENT, ["b", "a", "c"])

    expect(readRulesOrder(EVENT)).toEqual(["b", "a", "c"])
  })

  it("keeps one order per event", () => {
    writeRulesOrder(EVENT, ["b", "a"])
    writeRulesOrder("22222222-2222-4222-8222-222222222222", ["a", "b"])

    expect(readRulesOrder(EVENT)).toEqual(["b", "a"])
  })

  it("forgets the order once the run is over", () => {
    writeRulesOrder(EVENT, ["b", "a"])
    clearRulesOrder(EVENT)

    expect(readRulesOrder(EVENT)).toBeNull()
  })

  it("turns away a payload that is not a list of ids", () => {
    sessionStorage.setItem(`rules-order:${EVENT}`, JSON.stringify({ a: 1 }))

    expect(readRulesOrder(EVENT)).toBeNull()
  })

  it("turns away a list holding anything but ids", () => {
    sessionStorage.setItem(`rules-order:${EVENT}`, JSON.stringify(["a", 2]))

    expect(readRulesOrder(EVENT)).toBeNull()
  })

  it("turns away a payload that is not json at all", () => {
    sessionStorage.setItem(`rules-order:${EVENT}`, "{")

    expect(readRulesOrder(EVENT)).toBeNull()
  })
})
