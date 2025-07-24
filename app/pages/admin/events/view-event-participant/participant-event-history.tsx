import { Column } from "primereact/column"
import { type FC } from "react"
import { DataTable } from "~/components/organisms/tables/base/data-table"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import {
  applicationStatusOptions,
  attendanceStatusOptions,
  approvedToAttendStatusOptions,
} from "~/lib/helpers/propMaps"
import type { ParticipantVsEvent } from "~types/entities.types"

type ParticipantEventHistoryProps = {
  participantHistory: Array<ParticipantVsEvent & { time_event_start: string }>
}

export const ParticipantEventHistory: FC<ParticipantEventHistoryProps> = ({
  participantHistory,
}) => {
  const eventBodyTemplate = (rowData: ParticipantVsEvent & { time_event_start: string }) => {
    const eventDate = formatDateTime(rowData.time_event_start).date
    return (
      <div>
        <div className="font-medium">
          {rowData.event_emoji} {rowData.event_title}
        </div>
        <div className="text-sm text-gray-500">{eventDate}</div>
      </div>
    )
  }

  const applicationStatusBodyTemplate = (rowData: ParticipantVsEvent & { time_event_start: string }) => {
    const status = applicationStatusOptions.find(
      (opt) => opt.value === rowData.application_status
    )
    return status?.name || rowData.application_status
  }

  const attendanceStatusBodyTemplate = (rowData: ParticipantVsEvent & { time_event_start: string }) => {
    const status = attendanceStatusOptions.find(
      (opt) => opt.value === rowData.attendance_status
    )
    return status?.name || rowData.attendance_status
  }

  const approvalStatusBodyTemplate = (rowData: ParticipantVsEvent & { time_event_start: string }) => {
    const status = approvedToAttendStatusOptions.find(
      (opt) => opt.value === rowData.approved_to_attend
    )
    return status?.name || rowData.approved_to_attend
  }

  return (
    <>
      <h2>Histórico de Participações</h2>
      <DataTable
        data={participantHistory}
        id="participant-history"
        sortField="time_event_start"
        size="small"
        emptyMessage="Nenhuma participação anterior encontrada"
      >
        <Column
          field="event_title"
          header="Evento"
          body={eventBodyTemplate}
          sortable
        />
        <Column
          field="application_status"
          header="Status de Inscrição"
          body={applicationStatusBodyTemplate}
          sortable
        />
        <Column
          field="approved_to_attend"
          header="Status de Aprovação"
          body={approvalStatusBodyTemplate}
          sortable
        />
        <Column
          field="attendance_status"
          header="Comparecimento"
          body={attendanceStatusBodyTemplate}
          sortable
        />
        <Column
          field="admin_general_notes"
          header="Notas do Admin"
          sortable
        />
      </DataTable>
    </>
  )
}
