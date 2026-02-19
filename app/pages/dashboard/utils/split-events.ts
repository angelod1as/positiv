import { checkEventStatus } from "~/lib/helpers/check-event-status"
import type { Event } from "~types/database/entities.types"

export const splitEvents = (events: Event[] | undefined) => {
  const empty: {
    registrationOpen: Event[]
    scheduled: Event[]
    registrationClosed: Event[]
  } = {
    registrationOpen: [],
    scheduled: [],
    registrationClosed: [],
  }

  if (!events || events.length < 1) return empty

  return events.reduce((acc, event) => {
    const { isOpen, isClosed } = checkEventStatus(event.event_status)
    if (isOpen) {
      acc.registrationOpen.push(event)
    } else if (isClosed) {
      acc.registrationClosed.push(event)
    } else {
      acc.scheduled.push(event)
    }
    return acc
  }, empty)
}
