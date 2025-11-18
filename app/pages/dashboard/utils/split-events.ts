import { checkEventStatus } from "~/lib/helpers/check-event-status"
import type { ViewEvent } from "~types/database/entities.types"

export const splitEvents = (events: ViewEvent[] | undefined) => {
  const empty: {
    registrationOpen: ViewEvent[]
    scheduled: ViewEvent[]
    registrationClosed: ViewEvent[]
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
