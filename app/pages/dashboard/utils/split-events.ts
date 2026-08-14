import type { Event } from "~types/database/entities.types"

export const splitEvents = (events: Event[] | undefined) => {
  const empty: {
    applied: Event[]
    available: Event[]
  } = {
    applied: [],
    available: [],
  }

  if (!events || events.length < 1) return empty

  return events.reduce((acc, event) => {
    if (event.is_applied) {
      acc.applied.push(event)
    } else {
      acc.available.push(event)
    }
    return acc
  }, empty)
}
