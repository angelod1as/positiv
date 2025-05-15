import ical, { ICalAlarmType, ICalCalendarMethod } from "ical-generator"
import type { Event, ViewEvent } from "~types/entities.types"
import { POSITIV_EMAIL, POSITIV_URL } from "../../lib/helpers/constants"

export const formatCalendarEvent = async (event: ViewEvent | Event) => {
  const { starting_time, ending_time, location, title, emoji } = event
  if (!starting_time || !ending_time || !title || !location) return

  const calendar = ical({ name: "convite" })
  calendar.method(ICalCalendarMethod.REQUEST)

  const startTime = new Date(starting_time)
  const endTime = new Date(ending_time)

  const calendarEvent = calendar.createEvent({
    timezone: "America/Sao_Paulo",
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

  calendarEvent.createAlarm({ type: ICalAlarmType.email, trigger: 1800 })
  calendarEvent.createAlarm({ type: ICalAlarmType.display, trigger: 300 })

  return calendar
}
