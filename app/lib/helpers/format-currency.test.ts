import { describe, expect, it } from "vitest"
import {
  centsToReaisInput,
  formatCurrency,
  formatSignedCurrency,
  reaisToCents,
} from "./format-currency"

describe("formatCurrency", () => {
  it("formats cents as reais with two decimals", () => {
    expect(formatCurrency(22000)).toBe("R$ 220,00")
    expect(formatCurrency(22199)).toBe("R$ 221,99")
    expect(formatCurrency(0)).toBe("R$ 0,00")
    expect(formatCurrency(5)).toBe("R$ 0,05")
  })

  it("groups thousands with a dot", () => {
    expect(formatCurrency(123456789)).toBe("R$ 1.234.567,89")
  })

  it("uses a regular space after R$, not a non-breaking one", () => {
    expect(formatCurrency(100)).toBe("R$ 1,00")
    expect(formatCurrency(100).charCodeAt(2)).toBe(32)
  })

  it("formats negative amounts with the sign before R$", () => {
    expect(formatCurrency(-2500)).toBe("-R$ 25,00")
  })

  it("treats null and undefined as zero", () => {
    expect(formatCurrency(null)).toBe("R$ 0,00")
    expect(formatCurrency(undefined)).toBe("R$ 0,00")
  })
})

describe("formatSignedCurrency", () => {
  it("marks a surplus with a plus and a deficit with a minus", () => {
    expect(formatSignedCurrency(7000)).toBe("+R$ 70,00")
    expect(formatSignedCurrency(-7000)).toBe("-R$ 70,00")
    expect(formatSignedCurrency(0)).toBe("+R$ 0,00")
  })
})

describe("reaisToCents", () => {
  it("accepts numbers and the strings a Brazilian keyboard produces", () => {
    expect(reaisToCents(220)).toBe(22000)
    expect(reaisToCents("220")).toBe(22000)
    expect(reaisToCents("220,50")).toBe(22050)
    expect(reaisToCents("1.234,56")).toBe(123456)
    expect(reaisToCents(" 220 ")).toBe(22000)
  })

  it("rounds to the nearest cent", () => {
    expect(reaisToCents(220.005)).toBe(22001)
    expect(reaisToCents("0,004")).toBe(0)
  })

  it("returns NaN for something that is not a number", () => {
    expect(reaisToCents("abc")).toBeNaN()
    expect(reaisToCents("")).toBeNaN()
  })
})

describe("centsToReaisInput", () => {
  it("renders cents as the decimal a number input reads back", () => {
    expect(centsToReaisInput(22000)).toBe("220")
    expect(centsToReaisInput(22050)).toBe("220.5")
    expect(centsToReaisInput(0)).toBe("0")
    expect(centsToReaisInput(null)).toBe("0")
  })
})
