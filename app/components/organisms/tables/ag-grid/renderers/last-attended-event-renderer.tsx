import type { ICellRendererParams } from "ag-grid-community"
import { Link } from "~/components/atoms/link/link"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

const MAX_TITLE_LENGTH = 20

interface LastAttendedEventData {
  last_attended_event_id?: string | null
  last_attended_event_title?: string | null
  last_attended_event_date?: string | null
  profile_id?: string | null
}

export function LastAttendedEventRenderer(params: ICellRendererParams) {
  const data = params.data as LastAttendedEventData | undefined

  const title = data?.last_attended_event_title
  const date = data?.last_attended_event_date
  const eventId = data?.last_attended_event_id
  const profileId = data?.profile_id

  if (!title || !date) {
    return <>-</>
  }

  const formattedDate = formatDateTime(date, "numeric").date
  if (!formattedDate) return <>-</>

  const truncatedTitle =
    title.length > MAX_TITLE_LENGTH
      ? `${title.substring(0, MAX_TITLE_LENGTH)}…`
      : title

  const canLink = eventId && profileId

  return (
    <div>
      <div className="text-sm text-gray-500">{formattedDate}</div>
      {canLink ? (
        <Link to={ADMIN_EVENT_VIEW_PARTICIPANT(eventId, profileId)} title={title}>
          {truncatedTitle}
        </Link>
      ) : (
        <span>{truncatedTitle}</span>
      )}
    </div>
  )
}
