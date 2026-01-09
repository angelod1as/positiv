import type { ICellRendererParams } from "ag-grid-community"
import { EyeIcon } from "lucide-react"
import { Link } from "~/components/atoms/link/link"
import paths from "~/lib/paths"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

interface ActionButtonsRowData {
  profile_id?: string | null
}

interface ActionButtonsContext {
  eventId?: string
}

export function ActionButtonsRenderer(params: ICellRendererParams) {
  const data = params.data as ActionButtonsRowData | undefined
  const context = params.context as ActionButtonsContext | undefined

  const profileId = data?.profile_id
  const eventId = context?.eventId

  if (!profileId || !eventId) {
    return null
  }

  return (
    <Link
      to={ADMIN_EVENT_VIEW_PARTICIPANT(eventId, profileId)}
      title="Ver participante"
      className="inline-flex items-center justify-center p-1 hover:bg-gray-100 rounded"
    >
      <EyeIcon className="h-4 w-4" />
    </Link>
  )
}
