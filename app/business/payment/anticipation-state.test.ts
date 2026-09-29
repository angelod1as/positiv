import { describe, expect, it } from "vitest"
import { summarizeAnticipations } from "./anticipation-state"

describe("summarizeAnticipations", () => {
  it("adds up the fees of a plan's anticipations", () => {
    expect(
      summarizeAnticipations([
        { status: "PENDING", fee: 625 },
        { status: "PENDING", fee: 817 },
      ]),
    ).toEqual({ fee: 1442, status: "PENDING" })
  })

  it("reports the least advanced charge of a plan", () => {
    expect(
      summarizeAnticipations([
        { status: "CREDITED", fee: 625 },
        { status: "SCHEDULED", fee: 817 },
      ]).status,
    ).toBe("SCHEDULED")
  })

  it("leaves a cancelled or denied anticipation out of the fee", () => {
    expect(
      summarizeAnticipations([
        { status: "CREDITED", fee: 625 },
        { status: "CANCELLED", fee: 817 },
      ]),
    ).toEqual({ fee: 625, status: "CREDITED" })
  })

  it("says so when every anticipation was cancelled", () => {
    expect(
      summarizeAnticipations([
        { status: "CANCELLED", fee: 625 },
        { status: "CANCELLED", fee: 817 },
      ]),
    ).toEqual({ fee: 0, status: "CANCELLED" })
  })

  it("has nothing to say about a charge that was never anticipated", () => {
    expect(summarizeAnticipations([])).toEqual({ fee: null, status: null })
  })
})
