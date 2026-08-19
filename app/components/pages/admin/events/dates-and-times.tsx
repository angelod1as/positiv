import { type FC } from "react"
import { adminEventsCopy } from "~/copy/admin/events"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { Event } from "~types/database/entities.types"

const datesCopy = adminEventsCopy.datesAndTimes

type DatesAndTimesProps = Event
export const DatesAndTimes: FC<DatesAndTimesProps> = ({
  time_application_start,
  time_event_end,
  time_event_start,
  time_group_end,
  time_group_start,
  time_payment_end,
  time_payment_start,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <h2>{datesCopy.title}</h2>
      <table className="min-w-full border-collapse text-left">
        <thead>
          <tr>
            <th />
            <th className="font-bold">{datesCopy.start}</th>
            <th className="font-bold">{datesCopy.end}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-bold">{datesCopy.applications}</td>
            <td>{formatDateTime(time_application_start).date}</td>
            <td />
          </tr>
          <tr>
            <td className="font-bold">{datesCopy.payment}</td>
            <td>{formatDateTime(time_payment_start).date}</td>
            <td>{formatDateTime(time_payment_end).date}</td>
          </tr>
          <tr>
            <td className="font-bold">{datesCopy.group}</td>
            <td>{formatDateTime(time_group_start).date}</td>
            <td>{formatDateTime(time_group_end).date}</td>
          </tr>
          <tr>
            <td className="font-bold">{datesCopy.event}</td>
            <td>{formatDateTime(time_event_start).date}</td>
            <td>{formatDateTime(time_event_end).date}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
