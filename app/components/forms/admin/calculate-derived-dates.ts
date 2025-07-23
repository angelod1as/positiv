import { addDays } from "date-fns/addDays"
import { format } from "date-fns/format"
import { setHours } from "date-fns/setHours"
import { setMinutes } from "date-fns/setMinutes"
import type { eventFormSchema } from "~/business/admin/common"
import { dateTimeFormat } from "~/lib/utils"

type DayOffsets = keyof Omit<
  (typeof eventFormSchema)["shape"],
  | "id"
  | "title"
  | "description"
  | "emoji"
  | "location"
  | "ticket_price"
  | "total_spots"
  | "event_type"
>

const dayOffsets: Record<DayOffsets, number> = {
  time_event_start: 0,
  time_event_end: 0,
  time_application_start: -30,
  time_application_end: -23,
  time_interviews_start: -21,
  time_interviews_end: -9,
  time_group_start: -7,
  time_group_end: 30,
  time_payment_start: -21,
  time_payment_end: -9,
}

export type PickedDay = keyof typeof dayOffsets

export const calculateDerivedDates = (
  startingTime: string,
): Record<PickedDay, string> => {
  const startingTimeDate = new Date(startingTime)

  const calculatedDates = <{ [T in PickedDay]: string }>{}

  for (const prop in dayOffsets) {
    const key = prop as PickedDay
    const offset = dayOffsets[key]
    let value = addDays(startingTimeDate, offset)

    switch (key) {
      case "time_event_start":
        value = startingTimeDate
        break
      case "time_event_end":
        value = setHours(value, 23)
        value = setMinutes(value, 59)
        break
      case "time_application_start":
      case "time_group_start":
      case "time_interviews_start":
      case "time_payment_start":
        value = setHours(value, 8)
        break
      case "time_application_end":
      case "time_group_end":
      case "time_interviews_end":
      case "time_payment_end":
        value = setHours(value, 22)
        break
    }
    calculatedDates[key] = format(value, dateTimeFormat)
  }

  return calculatedDates
}
