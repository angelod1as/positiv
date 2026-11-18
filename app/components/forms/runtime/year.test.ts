import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { yearSchema } from "./year"

const parse = (value: unknown) => yearSchema.safeParse(value)
const message = (value: unknown) => parse(value).error?.issues[0].message

describe("yearSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 18))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("accepts the answer that opts out", () => {
    expect(parse({ none: true }).success).toBe(true)
  })

  it("accepts a past year", () => {
    expect(parse({ year: 2019 }).success).toBe(true)
  })

  it("accepts the current year", () => {
    expect(parse({ year: 2026 }).success).toBe(true)
  })

  it("refuses a question nobody answered", () => {
    expect(message(undefined)).toBe("Informe o ano")
  })

  it("refuses an answer without a year", () => {
    expect(message({})).toBe("Informe o ano")
  })

  it("accepts the first year the select offers", () => {
    expect(parse({ year: 1950 }).success).toBe(true)
  })

  it("refuses a year before the ones the select offers", () => {
    expect(parse({ year: 1949 }).success).toBe(false)
  })

  it("refuses a year still to come", () => {
    expect(message({ year: 2027 })).toBe("O ano não pode estar no futuro")
  })
})
