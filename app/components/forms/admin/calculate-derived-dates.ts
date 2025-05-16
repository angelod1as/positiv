import { addDays } from "date-fns/addDays"
import { format } from "date-fns/format"
import { setHours } from "date-fns/setHours"
import { setMinutes } from "date-fns/setMinutes"
import { dateTimeFormat } from "~/lib/utils"

const dayOffsets = {
  ending_time: 0,
  application_open_time: -30,
  application_close_time: -23,
  interview_process_start: -21,
  interview_process_end: -9,
  group_open_date: -7,
  group_close_date: 30,
  payment_start_date: -21,
  payment_end_date: -9,
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
      case "ending_time":
        value = setHours(value, 23)
        value = setMinutes(value, 59)
        break
      case "application_open_time":
      case "group_open_date":
      case "interview_process_start":
      case "payment_start_date":
        value = setHours(value, 8)
        break
      case "application_close_time":
      case "group_close_date":
      case "interview_process_end":
      case "payment_end_date":
        value = setHours(value, 22)
        break
    }
    calculatedDates[key] = format(value, dateTimeFormat)
  }

  return calculatedDates
}
