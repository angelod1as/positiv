import { startOfDay } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { useMemo, type FC } from "react"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { formatDate } from "~/lib/helpers/format-date"
import { eventPropNameMap } from "~/lib/helpers/propMaps"
import type { ViewEvent } from "~types/entities.types"

type ViewEventKey = keyof ViewEvent
type DateProperties = Pick<
  ViewEvent,
  | "time_application_end"
  | "time_application_start"
  | "time_event_end"
  | "time_group_end"
  | "time_group_start"
  | "time_interviews_end"
  | "time_interviews_start"
  | "time_payment_start"
  | "time_payment_end"
  | "time_event_start"
>

type ValidDateItem = {
  label: ViewEventKey
  value: Date
}

const buildNextStep = (
  dates: DateProperties,
): { current: string; next: string } => {
  const targetTimeZone = "America/Sao_Paulo" // GMT-3

  const now = new Date()
  const zonedNow = toZonedTime(now, targetTimeZone)
  const startOfTodayGMT3 = startOfDay(zonedNow)
  const cutoffTime = startOfTodayGMT3.getTime()

  const validDateItems: ValidDateItem[] = Object.entries(dates)
    .map(([label, value]) => {
      const dateValue = value ? new Date(value) : null
      return {
        label: label as ViewEventKey,
        value: dateValue,
      }
    })
    .filter(
      (item): item is ValidDateItem =>
        item.value instanceof Date && !isNaN(item.value.getTime()),
    )
    .sort((a, b) => a.value.getTime() - b.value.getTime())

  const { currentItem, nextItem } = validDateItems.reduce(
    (acc, item) => {
      const itemTime = item.value.getTime()

      if (itemTime <= cutoffTime) {
        // If the item is on or before the cutoff, it's a candidate for current.
        // We keep updating acc.currentItem to ensure we get the *last* one in the sorted list.
        acc.currentItem = item
      } else {
        // If the item is after the cutoff, it's a candidate for next.
        // Since the array is sorted, the *first* item we encounter here is the "next".
        // We only set acc.nextItem once.
        if (acc.nextItem === null) {
          acc.nextItem = item
        }
      }
      return acc
    },
    {
      currentItem: null as ValidDateItem | null,
      nextItem: null as ValidDateItem | null,
    },
  )

  const formattedCurrent = currentItem
    ? `${formatDate({ date: currentItem.value.toISOString() })} - ${eventPropNameMap(currentItem.label)}`
    : ""

  const formattedNext = nextItem
    ? `${formatDate({ date: nextItem.value.toISOString() })} - ${eventPropNameMap(nextItem.label)}`
    : ""

  return {
    current: formattedCurrent,
    next: formattedNext,
  }
}

type DateStatusProps = DateProperties
export const DateStatus: FC<DateStatusProps> = (props) => {
  const { current, next } = useMemo(() => {
    return buildNextStep(props)
  }, [props])

  return (
    <div>
      <h5>Etapas:</h5>
      {current && <DataPair pair={["Anterior", current]} />}
      {next && <DataPair pair={["Próxima", next]} />}
    </div>
  )
}
