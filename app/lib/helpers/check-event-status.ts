import type { EventStatus } from "~types/entities.types"

export const checkEventStatus = (event_status: EventStatus) => ({
  isScheduled: event_status === "Scheduled",
  isClosed: event_status === "Registration Closed",
  isOpen: event_status === "Registration Open",
})
