import { beforeEach, describe, expect, it } from "vitest"
import { clearRulesDeal, readRulesDeal, writeRulesDeal } from "./rules-order"

const EVENT = "11111111-1111-4111-8111-111111111111"

describe("the deal a rules run was dealt", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  const dealt = {
    questions: ["b", "a", "c"],
    options: { b: ["sim", "não"] },
  }

  it("has nothing to give before a run has started", () => {
    expect(readRulesDeal(EVENT)).toBeNull()
  })

  it("gives back the deal a run was dealt", () => {
    writeRulesDeal(EVENT, dealt)

    expect(readRulesDeal(EVENT)).toEqual(dealt)
  })

  it("keeps one deal per event", () => {
    writeRulesDeal(EVENT, dealt)
    writeRulesDeal("22222222-2222-4222-8222-222222222222", {
      questions: ["a", "b"],
      options: {},
    })

    expect(readRulesDeal(EVENT)).toEqual(dealt)
  })

  it("forgets the deal once the run is over", () => {
    writeRulesDeal(EVENT, dealt)
    clearRulesDeal(EVENT)

    expect(readRulesDeal(EVENT)).toBeNull()
  })

  it("turns away a payload that is not a deal", () => {
    sessionStorage.setItem(`rules-order:${EVENT}`, JSON.stringify({ a: 1 }))

    expect(readRulesDeal(EVENT)).toBeNull()
  })

  it("turns away a bare list, which is how the deal used to be written", () => {
    sessionStorage.setItem(`rules-order:${EVENT}`, JSON.stringify(["a", "b"]))

    expect(readRulesDeal(EVENT)).toBeNull()
  })

  it("turns away questions holding anything but ids", () => {
    sessionStorage.setItem(
      `rules-order:${EVENT}`,
      JSON.stringify({ questions: ["a", 2], options: {} }),
    )

    expect(readRulesDeal(EVENT)).toBeNull()
  })

  it("turns away an answer layout that is not a list of answers", () => {
    sessionStorage.setItem(
      `rules-order:${EVENT}`,
      JSON.stringify({ questions: ["a"], options: { a: "sim" } }),
    )

    expect(readRulesDeal(EVENT)).toBeNull()
  })

  it("turns away a payload that is not json at all", () => {
    sessionStorage.setItem(`rules-order:${EVENT}`, "{")

    expect(readRulesDeal(EVENT)).toBeNull()
  })
})
