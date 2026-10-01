import { describe, expect, it } from "vitest"
import { isBrazilianMobile, isValidPhone } from "./phone"

describe("isBrazilianMobile", () => {
  it("accepts a DDD followed by the nine digits of a mobile", () => {
    expect(isBrazilianMobile("11999998888")).toBe(true)
    expect(isBrazilianMobile(21987654321)).toBe(true)
    expect(isBrazilianMobile("99912345678")).toBe(true)
  })

  it("rejects a mobile still missing its ninth digit", () => {
    expect(isBrazilianMobile("1199998888")).toBe(false)
  })

  it("rejects a landline", () => {
    expect(isBrazilianMobile("1133334444")).toBe(false)
    expect(isBrazilianMobile("11333344445")).toBe(false)
  })

  it("rejects a DDD that does not exist", () => {
    expect(isBrazilianMobile("20999998888")).toBe(false)
    expect(isBrazilianMobile("10999998888")).toBe(false)
    expect(isBrazilianMobile("00999998888")).toBe(false)
  })

  it("rejects a number carrying the country code", () => {
    expect(isBrazilianMobile("5511999998888")).toBe(false)
  })

  it("rejects missing values", () => {
    expect(isBrazilianMobile("")).toBe(false)
    expect(isBrazilianMobile(null)).toBe(false)
    expect(isBrazilianMobile(undefined)).toBe(false)
  })
})

describe("isValidPhone", () => {
  it("accepts a Brazilian mobile that is not flagged international", () => {
    expect(isValidPhone("11999998888", false)).toBe(true)
  })

  it("rejects a Brazilian landline or a mobile missing its ninth digit", () => {
    expect(isValidPhone("1133334444", false)).toBe(false)
    expect(isValidPhone("1199998888", false)).toBe(false)
  })

  it("accepts a flagged international number with its country code", () => {
    expect(isValidPhone("12125551234", true)).toBe(true)
    expect(isValidPhone(351912345678, true)).toBe(true)
    expect(isValidPhone("12345678", true)).toBe(true)
    expect(isValidPhone("123456789012345", true)).toBe(true)
  })

  it("rejects an international number that is not flagged", () => {
    expect(isValidPhone("351912345678", false)).toBe(false)
  })

  it("rejects a flagged number that starts with 55", () => {
    expect(isValidPhone("5511999998888", true)).toBe(false)
  })

  it("rejects a flagged number shorter than 8 or longer than 15 digits", () => {
    expect(isValidPhone("1234567", true)).toBe(false)
    expect(isValidPhone("1234567890123456", true)).toBe(false)
  })

  it("rejects missing values either way", () => {
    expect(isValidPhone(null, false)).toBe(false)
    expect(isValidPhone(undefined, true)).toBe(false)
    expect(isValidPhone("", true)).toBe(false)
  })
})
