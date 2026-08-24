import { describe, expect, it } from "vitest"
import type { Event } from "~types/database/entities.types"
import { toEventAnswers } from "./to-event-answers"

const event: Event = {
  id: "123",
  title: "Rapa do Tacho",
  emoji: "🎉",
  description: "Para quem sobreviveu ao carnaval",
  location: "Motel Harmony",
  ticket_price: 200,
  total_spots: 60,
  event_type: "bdsm",
  event_status: "Draft",
  created_at: "2026-01-01",
  auto_publish: true,
  time_event_start: "2026-02-01T10:00:00",
  time_event_end: "2026-02-01T23:59:00",
  time_application_start: null,
  time_group_start: null,
  time_group_end: null,
  time_payment_start: null,
  time_payment_end: null,
  listmonk_list_id: null,
  listmonk_list_synced_at: null,
}

describe("toEventAnswers", () => {
  it("opens a new event publishing itself, and nothing else", () => {
    expect(toEventAnswers(null)).toEqual({ auto_publish: true })
  })

  it("hands over what the event says about itself", () => {
    const answers = toEventAnswers(event)

    expect(answers.title).toBe("Rapa do Tacho")
    expect(answers.emoji).toBe("🎉")
    expect(answers.location).toBe("Motel Harmony")
    expect(answers.auto_publish).toBe(true)
  })

  it("writes the numbers as the number fields read them back", () => {
    const answers = toEventAnswers(event)

    expect(answers.ticket_price).toBe("200")
    expect(answers.total_spots).toBe("60")
  })

  it("cuts the times down to what a datetime control shows", () => {
    const answers = toEventAnswers(event)

    expect(answers.time_event_start).toBe("2026-02-01T10:00")
    expect(answers.time_event_end).toBe("2026-02-01T23:59")
  })

  it("reads a time the database stored with a zone", () => {
    const answers = toEventAnswers({
      ...event,
      time_event_start: "2026-02-01T10:00:00.000Z",
    })

    expect(answers.time_event_start).toMatch(/^2026-02-01T\d{2}:\d{2}$/)
  })

  it("leaves out a time the event has not been given", () => {
    const answers = toEventAnswers(event)

    expect(answers).not.toHaveProperty("time_group_start")
  })

  it("keeps an event that refuses to publish itself refusing", () => {
    expect(toEventAnswers({ ...event, auto_publish: false }).auto_publish).toBe(
      false,
    )
  })
})
