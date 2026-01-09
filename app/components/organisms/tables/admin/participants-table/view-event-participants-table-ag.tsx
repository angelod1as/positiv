import type { ColDef } from "ag-grid-community"
import type { FC } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useFetcher } from "react-router"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { TextModalEditor } from "~/components/organisms/tables/ag-grid/editors/text-modal-editor"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { ActionButtonsRenderer } from "~/components/organisms/tables/ag-grid/renderers/action-buttons-renderer"
import { BooleanTextRenderer } from "~/components/organisms/tables/ag-grid/renderers/boolean-text-renderer"
import { FlagBadgeRenderer } from "~/components/organisms/tables/ag-grid/renderers/flag-badge-renderer"
import { LastAttendedEventRenderer } from "~/components/organisms/tables/ag-grid/renderers/last-attended-event-renderer"
import { PhoneButtonRenderer } from "~/components/organisms/tables/ag-grid/renderers/phone-button-renderer"
import { PronounsRenderer } from "~/components/organisms/tables/ag-grid/renderers/pronouns-renderer"
import { SocialNameRenderer } from "~/components/organisms/tables/ag-grid/renderers/social-name-renderer"
import { TextViewModalRenderer } from "~/components/organisms/tables/ag-grid/renderers/text-view-modal-renderer"
import { VeteranRookieBadgeRenderer } from "~/components/organisms/tables/ag-grid/renderers/veteran-rookie-badge-renderer"
import { WarningIndicatorRenderer } from "~/components/organisms/tables/ag-grid/renderers/warning-indicator-renderer"
import {
  applicationStatusOptions,
  approvedToAttendStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  genderFilterOptions,
  isVeteranFilterOptions,
  orientationFilterOptions,
  profilePropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import type { ComposableFetcherData } from "~types/database/entities.types"
import { countParticipants } from "./count-participants"

const STORAGE_KEYS = {
  applicationStatus: "participants-ag-filter-application_status",
  attendanceStatus: "participants-ag-filter-attendance_status",
  approvedToAttend: "participants-ag-filter-approved_to_attend",
  gender: "participants-ag-filter-gender",
  orientation: "participants-ag-filter-orientation",
  isVeteran: "participants-ag-filter-is_veteran",
}

function getStoredFilter(key: string, defaultValue: string[] = []): string[] {
  if (typeof window === "undefined") return defaultValue
  const stored = sessionStorage.getItem(key)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Fall back to default
    }
  }
  return defaultValue
}

type AdminViewEventParticipantsTableAGProps = {
  participants: ProfileWithExtraData[]
  eventId: string
}

export const AdminViewEventParticipantsTableAG: FC<
  AdminViewEventParticipantsTableAGProps
> = ({ participants, eventId }) => {
  const fetcher = useFetcher<ComposableFetcherData>()

  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.applicationStatus)
  )
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.attendanceStatus)
  )
  const [approvedToAttendFilter, setApprovedToAttendFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.approvedToAttend)
  )
  const [genderFilter, setGenderFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.gender)
  )
  const [orientationFilter, setOrientationFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.orientation)
  )
  const [isVeteranFilter, setIsVeteranFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.isVeteran)
  )

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.applicationStatus, JSON.stringify(applicationStatusFilter))
  }, [applicationStatusFilter])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.attendanceStatus, JSON.stringify(attendanceStatusFilter))
  }, [attendanceStatusFilter])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.approvedToAttend, JSON.stringify(approvedToAttendFilter))
  }, [approvedToAttendFilter])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.gender, JSON.stringify(genderFilter))
  }, [genderFilter])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.orientation, JSON.stringify(orientationFilter))
  }, [orientationFilter])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.isVeteran, JSON.stringify(isVeteranFilter))
  }, [isVeteranFilter])

  const filteredParticipants = useMemo(() => {
    let result = participants

    if (applicationStatusFilter.length > 0) {
      result = result.filter((p) => applicationStatusFilter.includes(p.application_status || ""))
    }
    if (attendanceStatusFilter.length > 0) {
      result = result.filter((p) => attendanceStatusFilter.includes(p.attendance_status || ""))
    }
    if (approvedToAttendFilter.length > 0) {
      result = result.filter((p) => approvedToAttendFilter.includes(p.approved_to_attend || ""))
    }
    if (genderFilter.length > 0) {
      result = result.filter((p) =>
        p.gender?.some((g) => genderFilter.includes(g))
      )
    }
    if (orientationFilter.length > 0) {
      result = result.filter((p) =>
        p.orientation?.some((o) => orientationFilter.includes(o))
      )
    }
    if (isVeteranFilter.length > 0) {
      result = result.filter((p) => {
        const veteranValue = p.is_veteran ? "true" : "false"
        return isVeteranFilter.includes(veteranValue)
      })
    }

    return result
  }, [
    participants,
    applicationStatusFilter,
    attendanceStatusFilter,
    approvedToAttendFilter,
    genderFilter,
    orientationFilter,
    isVeteranFilter,
  ])

  const handleSave = useCallback(
    async (id: string, field: string, value: unknown) => {
      const participant = participants.find((p) => p.id === id)
      if (!participant) return

      fetcher.submit(
        {
          intent: "update-event-participant",
          id,
          profile_id: participant.profile_id || "",
          [field]: value,
        },
        { method: "POST" }
      )
    },
    [participants, fetcher]
  )

  const columnDefs: ColDef<ProfileWithExtraData>[] = useMemo(
    () => [
      {
        field: "social_name",
        headerName: "Nome",
        pinned: "left",
        cellRenderer: SocialNameRenderer,
        sortable: true,
        width: 150,
      },
      {
        field: "full_name",
        headerName: profilePropMap("full_name"),
        sortable: true,
        width: 200,
      },
      {
        field: "is_veteran",
        headerName: "Vet ou Nov?",
        cellRenderer: VeteranRookieBadgeRenderer,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: isVeteranFilterOptions,
          field: "is_veteran",
          model: isVeteranFilter,
          onModelChange: setIsVeteranFilter,
        },
        width: 120,
      },
      {
        field: "attended_events_count",
        headerName: "Eventos",
        width: 90,
      },
      {
        field: "last_attended_event_title",
        headerName: "Último Evento",
        cellRenderer: LastAttendedEventRenderer,
        sortable: true,
        width: 180,
      },
      {
        field: "flag",
        headerName: profilePropMap("flag"),
        cellRenderer: FlagBadgeRenderer,
        sortable: true,
        width: 100,
      },
      {
        field: "pronouns",
        headerName: profilePropMap("pronouns"),
        cellRenderer: PronounsRenderer,
        width: 120,
      },
      {
        field: "gender",
        headerName: profilePropMap("gender"),
        cellRenderer: WarningIndicatorRenderer,
        cellRendererParams: { type: "gender" },
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: genderFilterOptions,
          field: "gender",
          model: genderFilter,
          onModelChange: setGenderFilter,
          matchMode: "array",
        },
        width: 150,
      },
      {
        field: "orientation",
        headerName: profilePropMap("orientation"),
        cellRenderer: WarningIndicatorRenderer,
        cellRendererParams: { type: "orientation" },
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: orientationFilterOptions,
          field: "orientation",
          model: orientationFilter,
          onModelChange: setOrientationFilter,
          matchMode: "array",
        },
        width: 150,
      },
      {
        field: "phone",
        headerName: profilePropMap("phone"),
        cellRenderer: PhoneButtonRenderer,
        width: 140,
      },
      {
        field: "application_status",
        headerName: eventParticipantPropMap("application_status"),
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: applicationStatusOptions.map((o) => o.value),
        },
        valueFormatter: (params) => {
          const option = applicationStatusOptions.find((o) => o.value === params.value)
          return option?.name || params.value
        },
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: applicationStatusOptions,
          field: "application_status",
          model: applicationStatusFilter,
          onModelChange: setApplicationStatusFilter,
        },
        width: 180,
      },
      {
        field: "attendance_status",
        headerName: eventParticipantPropMap("attendance_status"),
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: attendanceStatusOptions.map((o) => o.value),
        },
        valueFormatter: (params) => {
          const option = attendanceStatusOptions.find((o) => o.value === params.value)
          return option?.name || params.value
        },
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: attendanceStatusOptions,
          field: "attendance_status",
          model: attendanceStatusFilter,
          onModelChange: setAttendanceStatusFilter,
        },
        width: 180,
      },
      {
        field: "approved_to_attend",
        headerName: profilePropMap("approved_to_attend"),
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: approvedToAttendStatusOptions.map((o) => o.value),
        },
        valueFormatter: (params) => {
          const option = approvedToAttendStatusOptions.find((o) => o.value === params.value)
          return option?.name || params.value
        },
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: approvedToAttendStatusOptions,
          field: "approved_to_attend",
          model: approvedToAttendFilter,
          onModelChange: setApprovedToAttendFilter,
        },
        width: 180,
      },
      {
        field: "has_paid",
        headerName: eventParticipantPropMap("has_paid"),
        editable: true,
        cellEditor: "agCheckboxCellEditor",
        cellRenderer: "agCheckboxCellRenderer",
        width: 100,
      },
      {
        field: "payment",
        headerName: eventParticipantPropMap("payment"),
        editable: true,
        cellEditor: "agNumberCellEditor",
        width: 100,
      },
      {
        field: "spot_type",
        headerName: eventParticipantPropMap("spot_type"),
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: spotTypeOptions.map((o) => o.value),
        },
        valueFormatter: (params) => {
          const option = spotTypeOptions.find((o) => o.value === params.value)
          return option?.name || params.value
        },
        width: 130,
      },
      {
        colId: "is_veteran_edit",
        field: "is_veteran",
        headerName: profilePropMap("is_veteran"),
        editable: true,
        cellEditor: "agCheckboxCellEditor",
        cellRenderer: "agCheckboxCellRenderer",
        width: 100,
      },
      {
        field: "companions",
        headerName: eventParticipantPropMap("companions"),
        cellRenderer: TextViewModalRenderer,
        width: 200,
      },
      {
        field: "notes",
        headerName: eventParticipantPropMap("notes"),
        cellRenderer: TextModalEditor,
        width: 200,
      },
      {
        field: "admin_general_notes",
        headerName: eventParticipantPropMap("admin_general_notes"),
        cellRenderer: TextModalEditor,
        width: 200,
      },
      {
        field: "was_admin_skipped_last_event",
        headerName: "Foi rodízio na última festa?",
        cellRenderer: BooleanTextRenderer,
        width: 150,
      },
      {
        colId: "actions",
        headerName: "",
        cellRenderer: ActionButtonsRenderer,
        pinned: "right",
        width: 60,
        sortable: false,
        filter: false,
      },
    ],
    [
      applicationStatusFilter,
      attendanceStatusFilter,
      approvedToAttendFilter,
      genderFilter,
      orientationFilter,
      isVeteranFilter,
    ]
  )

  const handleClearFilters = useCallback(() => {
    setApplicationStatusFilter([])
    setAttendanceStatusFilter([])
    setApprovedToAttendFilter([])
    setGenderFilter([])
    setOrientationFilter([])
    setIsVeteranFilter([])
  }, [])

  const { acceptedInProcess, applications } = countParticipants(participants)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Inscrições</h2>
        <div className="flex items-center gap-4 text-sm">
          <p>
            <b>{applications.total}</b> inscrites
          </p>
          <p>
            <b>{acceptedInProcess.total}</b> aceites no processo
          </p>
          <span>|</span>
          <p>Geral:</p>
          <p>
            <b>{applications.rookies}</b> N
          </p>
          <p>
            <b>{applications.veterans}</b> V
          </p>
          <span>|</span>
          <p>Aceites no processo:</p>
          <p>
            <b>{acceptedInProcess.rookies}</b> N
          </p>
          <p>
            <b>{acceptedInProcess.veterans}</b> V
          </p>
        </div>
      </div>
      <AGDataTable
        id="participants-table-ag"
        data={filteredParticipants}
        columnDefs={columnDefs}
        context={{ eventId, onSave: handleSave }}
        pagination
        paginationPageSize={25}
        paginationPageSizeSelector={[10, 25, 50, 100]}
        emptyMessage="Nenhum participante encontrado"
        persistState
        showToolbar
        onClearFilters={handleClearFilters}
        onSave={async (params) => {
          await handleSave(params.rowId, params.field, params.newValue)
        }}
      />
    </div>
  )
}
