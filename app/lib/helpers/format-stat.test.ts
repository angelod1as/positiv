import { describe, expect, it } from "vitest"
import { formatStatChange, formatStatValue } from "./format-stat"

describe("formatStatValue", () => {
  it.each([
    [14, "14"],
    [1250, "1.250"],
    [1000000, "1.000.000"],
    [31.4, "31,4"],
    [31.37, "31,37"],
    [0, "0"],
    [-0.001, "0"],
  ])("writes %s without a unit as %s", (value, expected) => {
    expect(formatStatValue(value, "none")).toBe(expected)
  })

  it.each([
    [14, "14%"],
    [12.5, "12,5%"],
    [12.34, "12,34%"],
    [100, "100%"],
    [-0.001, "0%"],
  ])("writes %s percent as %s", (value, expected) => {
    expect(formatStatValue(value, "percent")).toBe(expected)
  })

  it.each([
    [12400, "R$ 12.400"],
    [12400.5, "R$ 12.400,50"],
    [0.9, "R$ 0,90"],
    [-300, "-R$ 300"],
    [-0.001, "R$ 0,00"],
  ])("writes %s reais as %s", (value, expected) => {
    expect(formatStatValue(value, "brl")).toBe(expected)
  })
})

describe("formatStatChange", () => {
  it.each([
    [22, 31, "+9 p.p."],
    [31, 22, "-9 p.p."],
    [10, 12.5, "+2,5 p.p."],
    [14, 14, "0 p.p."],
    [14, 13.96, "0 p.p."],
    [10, 10.333, "+0,3 p.p."],
  ])(
    "measures a percent going from %s to %s in percentage points: %s",
    (before, after, expected) => {
      expect(formatStatChange(before, after, "percent")).toBe(expected)
    },
  )

  it.each([
    ["none", 100, 112, "+12%"],
    ["none", 200, 150, "-25%"],
    ["none", 3, 4, "+33,3%"],
    ["brl", 8000, 12400, "+55%"],
    ["none", 14, 14, "0%"],
    ["none", 10000, 9999, "0%"],
    ["none", -100, -50, "+50%"],
  ] as const)(
    "measures %s going from %s to %s as a relative change: %s",
    (unit, before, after, expected) => {
      expect(formatStatChange(before, after, unit)).toBe(expected)
    },
  )

  it.each(["none", "brl"] as const)(
    "has no relative change in %s when the earlier value is zero",
    (unit) => {
      expect(formatStatChange(0, 10, unit)).toBeNull()
    },
  )

  it("still measures percentage points from zero", () => {
    expect(formatStatChange(0, 10, "percent")).toBe("+10 p.p.")
  })
})
