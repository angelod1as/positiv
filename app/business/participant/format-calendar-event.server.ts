import ical, { ICalAlarmType, ICalCalendarMethod } from "ical-generator"
import type { Event, ViewEvent } from "~types/entities.types"
import { POSITIV_EMAIL, POSITIV_URL } from "../../lib/helpers/constants"

export const formatCalendarEvent = async (event: ViewEvent | Event) => {
  const { time_event_start, time_event_end, location, title, emoji } = event
  if (!time_event_start || !time_event_end || !title || !location) return

  const calendar = ical({ name: "convite" })
  calendar.method(ICalCalendarMethod.REQUEST)

  const startTime = new Date(time_event_start)
  const endTime = new Date(time_event_end)

  const calendarEvent = calendar.createEvent({
    timezone: "America/Sao_Paulo",
    start: startTime,
    end: endTime,
    summary: `${emoji} ${title}`,
    description:
      "Você ainda não foi aprovade, hein! Mas já guarde na sua agenda esse delicioso evento Positiv para não esquecer!",
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
