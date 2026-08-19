import type { Event } from "~types/database/entities.types"
import { participantCopy } from "~/copy/participant"
import { POSITIV_URL } from "../constants/constants"

export const generateGoogleCalendarLink = (event: Event) => {
  const { time_event_start, time_event_end, location, title, emoji } = event
  if (!time_event_start || !time_event_end || !title || !location) return

  const startTime = new Date(time_event_start).toISOString()
  const endTime = new Date(time_event_end).toISOString()

  const root = new URL("https://calendar.google.com/calendar/render")
  root.searchParams.set("action", "TEMPLATE")
  root.searchParams.set("text", `${emoji} ${title}`)
  root.searchParams.set("dates", `${startTime}/${endTime}`)
  root.searchParams.set("location", location)
  root.searchParams.set("details", participantCopy.calendar.googleDetails)
  root.searchParams.set("rprop", POSITIV_URL)
  root.searchParams.set("ctz", "America/Sao_Paulo")

  return root.toString()
}
