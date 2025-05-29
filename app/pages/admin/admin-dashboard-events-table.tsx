import type { FC } from "react"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { Event } from "~types/entities.types"

type AdminDashboardEventsTableProps = {
  events: Event[]
}
export const AdminDashboardEventsTable: FC<AdminDashboardEventsTableProps> = ({
  events,
}) => {
  return (
    <ul>
      {events?.map(({ time_event_start, id, title }) => {
        if (!time_event_start) return
        return (
          <li key={id}>
            {formatDateTime(time_event_start).full} - {title}
          </li>
        )
      })}
    </ul>
  )
}
