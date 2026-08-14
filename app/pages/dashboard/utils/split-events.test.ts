import { describe, expect, it } from "vitest"
import type { Event } from "~types/database/entities.types"
import { splitEvents } from "./split-events"

const makeEvent = (overrides: Partial<Event>): Event =>
  ({
    id: "event-id",
    title: "Evento",
    event_status: "Registration Open",
    is_applied: false,
    ...overrides,
  }) as Event

describe("splitEvents", () => {
  it("returns empty lists when there are no events", () => {
    expect(splitEvents([])).toEqual({ applied: [], available: [] })
  })

  it("returns empty lists when events are undefined", () => {
    expect(splitEvents(undefined)).toEqual({ applied: [], available: [] })
  })

  it("puts events the person applied to in 'applied'", () => {
    const applied = makeEvent({ id: "applied-event", is_applied: true })
    const other = makeEvent({ id: "other-event", is_applied: false })

    const result = splitEvents([applied, other])

    expect(result.applied.map((e) => e.id)).toEqual(["applied-event"])
    expect(result.available.map((e) => e.id)).toEqual(["other-event"])
  })

  it("keeps an applied event out of 'available' even when registration is closed", () => {
    const applied = makeEvent({
      id: "closed-applied",
      is_applied: true,
      event_status: "Registration Closed",
    })

    const result = splitEvents([applied])

    expect(result.applied.map((e) => e.id)).toEqual(["closed-applied"])
    expect(result.available).toEqual([])
  })

  it("keeps scheduled and closed events the person did not apply to in 'available'", () => {
    const scheduled = makeEvent({ id: "scheduled", event_status: "Scheduled" })
    const closed = makeEvent({
      id: "closed",
      event_status: "Registration Closed",
    })

    const result = splitEvents([scheduled, closed])

    expect(result.available.map((e) => e.id)).toEqual(["scheduled", "closed"])
    expect(result.applied).toEqual([])
  })

  it("preserves the incoming order inside each list", () => {
    const first = makeEvent({ id: "first", is_applied: true })
    const second = makeEvent({ id: "second", is_applied: true })

    expect(splitEvents([first, second]).applied.map((e) => e.id)).toEqual([
      "first",
      "second",
    ])
  })
})
