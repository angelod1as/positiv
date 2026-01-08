import type { ICellRendererParams } from "ag-grid-community"
import { Link } from "~/components/atoms/link/link"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

// Truncate titles to 20 characters to fit grid cell width
const MAX_TITLE_LENGTH = 20

interface LinkedEventRowData {
  event_id?: string | null
  profile_id?: string | null
  event_emoji?: string | null
  event_title?: string | null
  time_event_start?: string | null
}

export function LinkedEventRenderer(params: ICellRendererParams) {
  const data = params.data as LinkedEventRowData | undefined

  if (!data?.event_title) return null

  const { event_id, profile_id, event_emoji, event_title, time_event_start } = data

  const truncatedTitle =
    event_title.length > MAX_TITLE_LENGTH
      ? `${event_title.substring(0, MAX_TITLE_LENGTH)}…`
      : event_title

  const displayText = event_emoji ? `${event_emoji} ${truncatedTitle}` : truncatedTitle

  const formattedDate = time_event_start
    ? formatDateTime(time_event_start).date
    : null

  const canLink = event_id && profile_id

  return (
    <div>
      {canLink ? (
        <Link to={ADMIN_EVENT_VIEW_PARTICIPANT(event_id, profile_id)} title={event_title}>
          {displayText}
        </Link>
      ) : (
        <div className="font-medium">{displayText}</div>
      )}
      {formattedDate && <div className="text-sm text-gray-500">{formattedDate}</div>}
    </div>
  )
}
