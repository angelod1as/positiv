import { describe, expect, it } from "vitest"
import { isValidCpf, normalizeCpf } from "./cpf"

describe("normalizeCpf", () => {
  it("keeps only digits", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725")
    expect(normalizeCpf(" 529 982 247 25 ")).toBe("52998224725")
  })

  it("returns an empty string for a missing value", () => {
    expect(normalizeCpf(null)).toBe("")
    expect(normalizeCpf(undefined)).toBe("")
  })
})

describe("isValidCpf", () => {
  it("accepts a CPF whose check digits match", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true)
    expect(isValidCpf("11144477735")).toBe(true)
    expect(isValidCpf("87748248800")).toBe(true)
  })

  it("rejects wrong check digits", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false)
    expect(isValidCpf("11144477736")).toBe(false)
    expect(isValidCpf("87748248801")).toBe(false)
  })

  it("rejects the repeated-digit CPFs that pass the checksum", () => {
    expect(isValidCpf("11111111111")).toBe(false)
    expect(isValidCpf("00000000000")).toBe(false)
    expect(isValidCpf("99999999999")).toBe(false)
  })

  it("rejects wrong lengths and missing values", () => {
    expect(isValidCpf("1234567890")).toBe(false)
    expect(isValidCpf("529982247250")).toBe(false)
    expect(isValidCpf("")).toBe(false)
    expect(isValidCpf(null)).toBe(false)
    expect(isValidCpf(undefined)).toBe(false)
  })
})
