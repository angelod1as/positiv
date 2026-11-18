import { describe, expect, it } from "vitest"
import { datavizRange } from "./dataviz-range"

const now = new Date("2026-11-17T12:00:00.000Z")
const params = (query: string) => new URLSearchParams(query)

describe("datavizRange", () => {
  it("runs from the first party with real data to now by default", () => {
    expect(datavizRange(params(""), now)).toEqual({
      from: "2025-06-21T00:00:00.000Z",
      to: "2026-11-17T12:00:00.000Z",
    })
  })

  it("keeps the dates the selector asked for", () => {
    expect(
      datavizRange(
        params("from=2025-09-01T22:00:00.000Z&to=2026-03-01T22:00:00.000Z"),
        now,
      ),
    ).toEqual({
      from: "2025-09-01T22:00:00.000Z",
      to: "2026-03-01T22:00:00.000Z",
    })
  })

  it("never starts before the first party with real data", () => {
    expect(datavizRange(params("from=2024-01-01"), now).from).toBe(
      "2025-06-21T00:00:00.000Z",
    )
  })

  it("falls back to the defaults for dates it cannot read", () => {
    expect(datavizRange(params("from=yesterday&to=soon"), now)).toEqual({
      from: "2025-06-21T00:00:00.000Z",
      to: "2026-11-17T12:00:00.000Z",
    })
  })

  it("ends now when the end comes before the start", () => {
    expect(
      datavizRange(params("from=2026-01-01T00:00:00.000Z&to=2025-12-01"), now).to,
    ).toBe("2026-11-17T12:00:00.000Z")
  })

  it("never ends before it starts when the start is still to come", () => {
    expect(datavizRange(params("from=2027-02-01T00:00:00.000Z"), now)).toEqual({
      from: "2027-02-01T00:00:00.000Z",
      to: "2027-02-01T00:00:00.000Z",
    })
  })
})
