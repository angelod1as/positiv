import type { EventStatus } from "~types/database/entities.types"

export const checkEventStatus = (event_status: EventStatus) => ({
  isScheduled: event_status === "Scheduled",
  isClosed: event_status === "Registration Closed",
  isOpen: event_status === "Registration Open",
  // An admin adds people directly to any event that is not a draft or
  // cancelled -- a closed one included, past its registration limit.
  acceptsDirectAdditions:
    event_status !== "Draft" && event_status !== "Cancelled",
})
