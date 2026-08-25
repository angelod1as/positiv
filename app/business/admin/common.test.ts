import { describe, expect, it } from "vitest"
import { eventFormSchema } from "./common"

const base = {
  title: "Festa",
  description: "Uma festa",
  emoji: "🎉",
  location: "Rua X",
  total_spots: 50,
  time_event_start: "2026-09-01T20:00",
  time_event_end: "2026-09-02T04:00",
  time_application_start: "2026-08-01T12:00",
  time_group_start: "2026-08-20T12:00",
  time_group_end: "2026-09-01T12:00",
  time_payment_start: "2026-08-10T12:00",
  time_payment_end: "2026-08-25T12:00",
}

describe("eventFormSchema.ticket_price", () => {
  it("converts the reais an admin types into cents", () => {
    expect(
      eventFormSchema.parse({ ...base, ticket_price: "220" }).ticket_price,
    ).toBe(22000)
    expect(
      eventFormSchema.parse({ ...base, ticket_price: "220,50" }).ticket_price,
    ).toBe(22050)
    expect(
      eventFormSchema.parse({ ...base, ticket_price: 220 }).ticket_price,
    ).toBe(22000)
  })

  it("still refuses a price below one real", () => {
    expect(() =>
      eventFormSchema.parse({ ...base, ticket_price: "0" }),
    ).toThrow()
    expect(() =>
      eventFormSchema.parse({ ...base, ticket_price: "0,50" }),
    ).toThrow()
  })

  it("refuses something that is not a number", () => {
    expect(() =>
      eventFormSchema.parse({ ...base, ticket_price: "abc" }),
    ).toThrow()
  })
})
