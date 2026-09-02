import type { ColDef, ICellRendererParams, IRowNode } from "ag-grid-community"
import type { FC } from "react"
import { useMemo } from "react"
import { Link } from "~/components/atoms/link/link"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import {
  formatCurrency,
  formatSignedCurrency,
} from "~/lib/helpers/format-currency"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { isSettledPayment } from "~/lib/helpers/payment-status"
import {
  applicationStatusOptions,
  attendanceStatusOptions,
  approvedToAttendStatusOptions,
  eventParticipantPropMap,
  eventPropNameMap,
  notesFilterOptions,
  profilePropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import { BooleanTextRenderer } from "~/components/organisms/tables/ag-grid/renderers/boolean-text-renderer"
import paths from "~/lib/paths"
import type { ParticipantEventHistoryData } from "~types/database/entities.types"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

const historyCopy = adminParticipantsCopy.eventHistory

const applicationStatusMap = new Map<string, string>(
  applicationStatusOptions.map((opt) => [opt.value, opt.name]),
)
const approvalStatusMap = new Map<string, string>(
  approvedToAttendStatusOptions.map((opt) => [opt.value, opt.name]),
)
const attendanceStatusMap = new Map<string, string>(
  attendanceStatusOptions.map((opt) => [opt.value, opt.name]),
)

const spotTypeMap = new Map<string, string>(
  spotTypeOptions.map((opt) => [opt.value, opt.name]),
)

type ParticipantEventHistoryProps = {
  participantHistory: ParticipantEventHistoryData[]
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
  return applicationStatusMap.get(value) || value
}

function ApprovalStatusRenderer(
  params: ICellRendererParams<ParticipantEventHistoryData>,
) {
  const value = params.value as string | undefined
  if (!value) return null
  return approvalStatusMap.get(value) || value
}

function AttendanceStatusRenderer(
  params: ICellRendererParams<ParticipantEventHistoryData>,
) {
  const value = params.value as string | undefined
  if (!value) return null
  return attendanceStatusMap.get(value) || value
}

function SpotTypeRenderer(
  params: ICellRendererParams<ParticipantEventHistoryData>,
) {
  const value = params.value as string | undefined
  if (!value) return null
  return spotTypeMap.get(value) || value
}

function PaymentRenderer(
  params: ICellRendererParams<ParticipantEventHistoryData>,
) {
  // Zero is an amount when the ledger settled the participation — a staff or
  // social spot owed nothing — and nothing at all when the charge is still
  // open or was never made.
  if (!isSettledPayment(params.data?.payment_status)) return null
  return formatCurrency(params.value as number | null | undefined)
}

function SurplusRenderer(
  params: ICellRendererParams<ParticipantEventHistoryData>,
) {
  const data = params.data
  if (!data) return null

  // A refunded participation keeps its gross — the charge happened — but there
  // is no difference to report on money that went back.
  if (data.net === 0) return null

  const ticketPrice = data.ticket_price ?? 0
  const surplus = data.net - ticketPrice
  const formattedValue = formatSignedCurrency(surplus)

  if (surplus >= 0) {
    return <span className="text-green-600">{formattedValue}</span>
  }
  return <span className="text-red-600">{formattedValue}</span>
}

export const ParticipantEventHistory: FC<ParticipantEventHistoryProps> = ({
  participantHistory,
}) => {
  const columnDefs: ColDef<ParticipantEventHistoryData>[] = useMemo(
    () => [
      {
        field: "event_title",
        headerName: eventPropNameMap("title"),
        cellRenderer: EventRenderer,
        sortable: true,
      },
      {
        field: "spot_type",
        headerName: eventParticipantPropMap("spot_type"),
        cellRenderer: SpotTypeRenderer,
        sortable: true,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: spotTypeOptions,
          field: "spot_type",
        },
      },
      {
        field: "paid_gross",
        headerName: historyCopy.payment,
        cellRenderer: PaymentRenderer,
        sortable: true,
      },
      {
        headerName: historyCopy.surplus,
        cellRenderer: SurplusRenderer,
        sortable: false,
      },
      {
        field: "application_status",
        headerName: eventParticipantPropMap("application_status"),
        cellRenderer: ApplicationStatusRenderer,
        sortable: true,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: applicationStatusOptions,
          field: "application_status",
        },
      },
      {
        field: "approved_to_attend",
        headerName: profilePropMap("approved_to_attend"),
        cellRenderer: ApprovalStatusRenderer,
        sortable: true,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: approvedToAttendStatusOptions,
          field: "approved_to_attend",
        },
      },
      {
        field: "attendance_status",
        headerName: eventParticipantPropMap("attendance_status"),
        cellRenderer: AttendanceStatusRenderer,
        sortable: true,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: attendanceStatusOptions,
          field: "attendance_status",
        },
      },
      {
        field: "was_selected_for_rotation",
        headerName: eventParticipantPropMap("was_selected_for_rotation"),
        cellRenderer: BooleanTextRenderer,
        sortable: true,
      },
      {
        field: "admin_general_notes",
        headerName: eventParticipantPropMap("admin_general_notes"),
        sortable: true,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: notesFilterOptions,
          getValue: (node: IRowNode<ParticipantEventHistoryData>) => {
            const notes = node.data?.admin_general_notes
            return notes && notes.trim() ? "has-notes" : "no-notes"
          },
        },
      },
    ],
    [],
  )

  return (
    <>
      <h2>{historyCopy.title}</h2>
      <AGDataTable
        id="participant-event-history"
        data={participantHistory}
        columnDefs={columnDefs}
        emptyMessage={historyCopy.empty}
      />
    </>
  )
}
