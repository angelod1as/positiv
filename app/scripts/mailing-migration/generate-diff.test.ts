import { describe, expect, it, vi } from "vitest"
import {
  isEmpty,
  formatValue,
  compareField,
  type DiffAction,
} from "./generate-diff"

describe("isEmpty", () => {
  it("should return true for null", () => {
    expect(isEmpty(null)).toBe(true)
  })

  it("should return true for undefined", () => {
    expect(isEmpty(undefined)).toBe(true)
  })

  it("should return true for empty string", () => {
    expect(isEmpty("")).toBe(true)
  })

  it("should return true for empty array", () => {
    expect(isEmpty([])).toBe(true)
  })

  it("should return false for non-empty string", () => {
    expect(isEmpty("hello")).toBe(false)
  })

  it("should return false for non-empty array", () => {
    expect(isEmpty(["a", "b"])).toBe(false)
  })

  it("should return false for a number", () => {
    expect(isEmpty(42)).toBe(false)
  })

  it("should return false for zero", () => {
    expect(isEmpty(0)).toBe(false)
  })
})

describe("formatValue", () => {
  it("should return empty string for null", () => {
    expect(formatValue(null)).toBe("")
  })

  it("should return empty string for undefined", () => {
    expect(formatValue(undefined)).toBe("")
  })

  it("should join array with comma", () => {
    expect(formatValue(["a", "b", "c"])).toBe("a,b,c")
  })

  it("should return empty string for empty array", () => {
    expect(formatValue([])).toBe("")
  })

  it("should convert number to string", () => {
    expect(formatValue(11999999999)).toBe("11999999999")
  })

  it("should return string as-is", () => {
    expect(formatValue("hello")).toBe("hello")
  })
})

describe("compareField", () => {
  it("should return null when both values are empty", () => {
    expect(compareField(null, null)).toBeNull()
  })

  it("should return null when db is empty string and sheet is null", () => {
    expect(compareField("", null)).toBeNull()
  })

  it("should return null when db is empty array and sheet is null", () => {
    expect(compareField([], null)).toBeNull()
  })

  it("should return 'manter_db' when db has value but sheet is empty", () => {
    expect(compareField("João", null)).toBe("manter_db" satisfies DiffAction)
  })

  it("should return 'manter_db' when db has array but sheet is empty", () => {
    expect(compareField(["Masculino"], null)).toBe(
      "manter_db" satisfies DiffAction,
    )
  })

  it("should return 'usar_planilha' when db is empty but sheet has value", () => {
    expect(compareField(null, "João")).toBe(
      "usar_planilha" satisfies DiffAction,
    )
  })

  it("should return 'usar_planilha' when db is empty array but sheet has value", () => {
    expect(compareField([], ["Feminino"])).toBe(
      "usar_planilha" satisfies DiffAction,
    )
  })

  it("should return null when both values are equal strings", () => {
    expect(compareField("João", "João")).toBeNull()
  })

  it("should return null when both values are equal arrays (same order)", () => {
    expect(compareField(["a", "b"], ["a", "b"])).toBeNull()
  })

  it("should return null when both values are equal arrays (different order)", () => {
    expect(compareField(["b", "a"], ["a", "b"])).toBeNull()
  })

  it("should return 'revisão_manual' when both have different values", () => {
    expect(compareField("João", "Maria")).toBe(
      "revisão_manual" satisfies DiffAction,
    )
  })

  it("should return 'revisão_manual' when arrays differ", () => {
    expect(compareField(["Masculino"], ["Feminino"])).toBe(
      "revisão_manual" satisfies DiffAction,
    )
  })

  it("should compare numbers correctly when equal", () => {
    expect(compareField(11999999999, 11999999999)).toBeNull()
  })

  it("should return 'revisão_manual' when numbers differ", () => {
    expect(compareField(11999999999, 11888888888)).toBe(
      "revisão_manual" satisfies DiffAction,
    )
  })
})
