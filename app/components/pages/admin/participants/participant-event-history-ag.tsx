import type { ColDef, ICellRendererParams } from "ag-grid-community"
import type { FC } from "react"
import { useMemo } from "react"
import { Link } from "~/components/atoms/link/link"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import {
  applicationStatusOptions,
  attendanceStatusOptions,
  approvedToAttendStatusOptions,
} from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { ParticipantVsEvent } from "~types/database/entities.types"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

type ParticipantEventHistoryData = ParticipantVsEvent & {
  time_event_start: string
}

type ParticipantEventHistoryAGProps = {
  participantHistory: Array<ParticipantEventHistoryData>
}

function EventRenderer(params: ICellRendererParams<ParticipantEventHistoryData>) {
  const data = params.data
  if (!data?.event_title) return null

  const { event_id, profile_id, event_emoji, event_title, time_event_start } =
    data
  const formattedDate = time_event_start
    ? formatDateTime(time_event_start).date
    : null
  const displayText = event_emoji ? `${event_emoji} ${event_title}` : event_title
  const canLink = event_id && profile_id

  return (
    <div>
      {canLink ? (
        <Link to={ADMIN_EVENT_VIEW_PARTICIPANT(event_id, profile_id)}>
          {displayText}
        </Link>
      ) : (
        <div className="font-medium">{displayText}</div>
      )}
      {formattedDate && (
        <div className="text-sm text-gray-500">{formattedDate}</div>
      )}
    </div>
  )
}

function ApplicationStatusRenderer(
  params: ICellRendererParams<ParticipantEventHistoryData>,
) {
  const value = params.value as string | undefined
  if (!value) return null
  const status = applicationStatusOptions.find((opt) => opt.value === value)
  return status?.name || value
}

function ApprovalStatusRenderer(
  params: ICellRendererParams<ParticipantEventHistoryData>,
) {
  const value = params.value as string | undefined
  if (!value) return null
  const status = approvedToAttendStatusOptions.find((opt) => opt.value === value)
  return status?.name || value
}

function AttendanceStatusRenderer(
  params: ICellRendererParams<ParticipantEventHistoryData>,
) {
  const value = params.value as string | undefined
  if (!value) return null
  const status = attendanceStatusOptions.find((opt) => opt.value === value)
  return status?.name || value
}

export const ParticipantEventHistoryAG: FC<ParticipantEventHistoryAGProps> = ({
  participantHistory,
}) => {
  const columnDefs: ColDef<ParticipantEventHistoryData>[] = useMemo(
    () => [
      {
        field: "event_title",
        headerName: "Evento",
        cellRenderer: EventRenderer,
        sortable: true,
      },
      {
        field: "application_status",
        headerName: "Status de Inscrição",
        cellRenderer: ApplicationStatusRenderer,
        sortable: true,
      },
      {
        field: "approved_to_attend",
        headerName: "Status de Aprovação",
        cellRenderer: ApprovalStatusRenderer,
        sortable: true,
      },
      {
        field: "attendance_status",
        headerName: "Comparecimento",
        cellRenderer: AttendanceStatusRenderer,
        sortable: true,
      },
      {
        field: "admin_general_notes",
        headerName: "Notas do Admin",
        sortable: true,
      },
    ],
    [],
  )

  return (
    <>
      <h2>Histórico de Inscrições</h2>
      <AGDataTable
        id="participant-event-history-ag"
        data={participantHistory}
        columnDefs={columnDefs}
        emptyMessage="Nenhuma inscrição anterior encontrada"
      />
    </>
  )
}
