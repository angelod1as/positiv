import { describe, expect, it } from "vitest"
import { eventFormValidation } from "~/copy/admin/events"
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

  it("still refuses a price below one real, saying why", () => {
    for (const tooSmall of ["0", "0,50", "0.50"]) {
      const result = eventFormSchema.safeParse({
        ...base,
        ticket_price: tooSmall,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          eventFormValidation.ticketPriceTooSmall,
        )
      }
    }
  })

  it("refuses something that is not a number", () => {
    expect(() =>
      eventFormSchema.parse({ ...base, ticket_price: "abc" }),
    ).toThrow()
  })
})
