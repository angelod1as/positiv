import ical, { ICalCalendarMethod } from "ical-generator"
import type { ViewEvent } from "~types/entities.types"
import { POSITIV_EMAIL, POSITIV_URL } from "../helpers/constants"

export const formatCalendarEvent = async (event: ViewEvent) => {
  const { starting_time, ending_time, location, title, emoji } = event
  if (!starting_time || !ending_time || !title || !location) return

  const calendar = ical({ name: "convite" })
  calendar.method(ICalCalendarMethod.REQUEST)

  const startTime = new Date(starting_time)
  const endTime = new Date(ending_time)

  calendar.createEvent({
    start: startTime,
    end: endTime,
    summary: `${emoji} ${title}`,
    description: "Mais um delicioso evento Positiv para você!",
    location,
    organizer: {
      name: "Positiv Party",
      email: POSITIV_EMAIL,
    },
    url: POSITIV_URL,
  })

  return calendar
}
