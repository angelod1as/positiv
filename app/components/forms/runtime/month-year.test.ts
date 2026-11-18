import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { monthYearSchema } from "./month-year"

const parse = (value: unknown) => monthYearSchema.safeParse(value)
const message = (value: unknown) => parse(value).error?.issues[0].message

describe("monthYearSchema", () => {
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

  it("accepts a past month and year", () => {
    expect(parse({ month: 3, year: 2019 }).success).toBe(true)
  })

  it("accepts the current month", () => {
    expect(parse({ month: 11, year: 2026 }).success).toBe(true)
  })

  it("refuses a question nobody answered", () => {
    expect(message(undefined)).toBe("Informe o mês e o ano")
  })

  it("refuses a year without a month", () => {
    expect(message({ year: 2019 })).toBe("Informe o mês e o ano")
  })

  it("refuses a month without a year", () => {
    expect(message({ month: 3 })).toBe("Informe o mês e o ano")
  })

  it("refuses a month that does not exist", () => {
    expect(parse({ month: 13, year: 2019 }).success).toBe(false)
  })

  it("refuses a month still to come", () => {
    expect(message({ month: 12, year: 2026 })).toBe(
      "A data não pode estar no futuro",
    )
  })
})
