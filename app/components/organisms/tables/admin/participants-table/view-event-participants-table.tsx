/**
 * AG Grid Participants Table - Event View
 *
 * Uses AG Grid for filtering, sorting, inline editing, and pagination.
 */
import type {
  CellValueChangedEvent,
  ColDef,
  ValueSetterParams,
} from "ag-grid-community"
import { Search } from "lucide-react"
import type { FC } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useFetcher } from "react-router"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { ActionButtonsRenderer } from "~/components/organisms/tables/ag-grid/renderers/action-buttons-renderer"
import { BooleanTextRenderer } from "~/components/organisms/tables/ag-grid/renderers/boolean-text-renderer"
import { FlagBadgeRenderer } from "~/components/organisms/tables/ag-grid/renderers/flag-badge-renderer"
import { LastAttendedEventRenderer } from "~/components/organisms/tables/ag-grid/renderers/last-attended-event-renderer"
import { PhoneButtonRenderer } from "~/components/organisms/tables/ag-grid/renderers/phone-button-renderer"
import { PronounsRenderer } from "~/components/organisms/tables/ag-grid/renderers/pronouns-renderer"
import { SocialNameRenderer } from "~/components/organisms/tables/ag-grid/renderers/social-name-renderer"
import { TextViewModalRenderer } from "~/components/organisms/tables/ag-grid/renderers/text-view-modal-renderer"
import { WarningIndicatorRenderer } from "~/components/organisms/tables/ag-grid/renderers/warning-indicator-renderer"
import { Input } from "~/components/ui/input"
import {
  getEventCountColors,
  getVeteranRookieColors,
} from "~/lib/helpers/cell-colors"
import {
  applicationStatusOptions,
  approvedToAttendStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  genderFilterOptions,
  hasPaidOptions,
  isVeteranOptions,
  orientationFilterOptions,
  profilePropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import type { ComposableFetcherData } from "~types/database/entities.types"
import { countParticipants } from "./count-participants"
import {
  parsePaymentValue,
  shouldAutoCheckHasPaid,
} from "./payment-column-helpers"
import { shouldAutoCheckWasSelectedForRotation } from "./rotation-column-helpers"

// Filter state uses sessionStorage (clears when tab closes) - intentional so admins
// start fresh each session. Grid layout state uses localStorage (persists across sessions)
// via use-grid-state.ts, so column widths and order are preserved.
const STORAGE_KEYS = {
  applicationStatus: "participants-filter-application_status",
  attendanceStatus: "participants-filter-attendance_status",
  approvedToAttend: "participants-filter-approved_to_attend",
  gender: "participants-filter-gender",
  orientation: "participants-filter-orientation",
  isVeteran: "participants-filter-is_veteran",
  hasPaid: "participants-filter-has_paid",
  spotType: "participants-filter-spot_type",
}

const EDITABLE_FIELDS = [
  "application_status",
  "attendance_status",
  "approved_to_attend",
  "has_paid",
  "payment",
  "spot_type",
  "is_veteran",
  "notes",
  "admin_general_notes",
  "was_selected_for_rotation",
] as const

const compactCell = {
  suppressSizeToFit: true,
  cellClass: "ag-cell-compact",
  width: 40,
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

type AdminViewEventParticipantsTableProps = {
  participants: ProfileWithExtraData[]
  eventId: string
}

export const AdminViewEventParticipantsTable: FC<
  AdminViewEventParticipantsTableProps
> = ({ participants, eventId }) => {
  const fetcher = useFetcher<ComposableFetcherData>()

  const [applicationStatusFilter, setApplicationStatusFilter] = useState<
    string[]
  >(() => getStoredFilter(STORAGE_KEYS.applicationStatus))
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<
    string[]
  >(() => getStoredFilter(STORAGE_KEYS.attendanceStatus))
  const [approvedToAttendFilter, setApprovedToAttendFilter] = useState<
    string[]
  >(() => getStoredFilter(STORAGE_KEYS.approvedToAttend))
  const [genderFilter, setGenderFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.gender),
  )
  const [orientationFilter, setOrientationFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.orientation),
  )
  const [isVeteranFilter, setIsVeteranFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.isVeteran),
  )
  const [hasPaidFilter, setHasPaidFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.hasPaid),
  )
  const [spotTypeFilter, setSpotTypeFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.spotType),
  )
  const [searchText, setSearchText] = useState("")

  // Persist all filter states to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEYS.applicationStatus,
      JSON.stringify(applicationStatusFilter),
    )
    sessionStorage.setItem(
      STORAGE_KEYS.attendanceStatus,
      JSON.stringify(attendanceStatusFilter),
    )
    sessionStorage.setItem(
      STORAGE_KEYS.approvedToAttend,
      JSON.stringify(approvedToAttendFilter),
    )
    sessionStorage.setItem(STORAGE_KEYS.gender, JSON.stringify(genderFilter))
    sessionStorage.setItem(
      STORAGE_KEYS.orientation,
      JSON.stringify(orientationFilter),
    )
    sessionStorage.setItem(
      STORAGE_KEYS.isVeteran,
      JSON.stringify(isVeteranFilter),
    )
    sessionStorage.setItem(STORAGE_KEYS.hasPaid, JSON.stringify(hasPaidFilter))
    sessionStorage.setItem(
      STORAGE_KEYS.spotType,
      JSON.stringify(spotTypeFilter),
    )
  }, [
    applicationStatusFilter,
    attendanceStatusFilter,
    approvedToAttendFilter,
    genderFilter,
    orientationFilter,
    isVeteranFilter,
    hasPaidFilter,
    spotTypeFilter,
  ])

  // Note: Filtering is now delegated to AG Grid via BaseMultiSelectFilter's doesFilterPass.
  // The filter state (applicationStatusFilter, etc.) is passed to filterParams and
  // AG Grid handles the filtering internally for better performance.

  const handleSave = useCallback(
    async (params: { field: string; newValue: unknown; rowData: unknown }) => {
      const rowData = params.rowData as ProfileWithExtraData | undefined
      if (!rowData?.id) return

      // Validate field against whitelist to prevent parameter tampering
      if (
        !EDITABLE_FIELDS.includes(
          params.field as (typeof EDITABLE_FIELDS)[number],
        )
      ) {
        return
      }

      const formData = new FormData()
      formData.append("intent", "update-event-participant")
      formData.append("id", rowData.id)
      formData.append("profile_id", rowData.profile_id ?? "")
      formData.append(params.field, String(params.newValue ?? ""))

      fetcher.submit(formData, { method: "POST" })
    },
    [fetcher],
  )

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ProfileWithExtraData>) => {
      // Auto-persist has_paid when payment > 0
      if (
        event.colDef.field === "payment" &&
        event.newValue !== null &&
        event.newValue > 0 &&
        event.data?.has_paid === true &&
        event.oldValue !== event.newValue
      ) {
        const formData = new FormData()
        formData.append("intent", "update-event-participant")
        formData.append("id", event.data.id)
        formData.append("profile_id", event.data.profile_id ?? "")
        formData.append("has_paid", "true")
        fetcher.submit(formData, { method: "POST" })
      }
    },
    [fetcher],
  )

  // Memoize dynamic filter options to prevent recalculation on every render
  const memoizedGenderOptions = useMemo(
    () => genderFilterOptions(participants),
    [participants],
  )
  const memoizedOrientationOptions = useMemo(
    () => orientationFilterOptions(participants),
    [participants],
  )

  const columnDefs: ColDef<ProfileWithExtraData>[] = useMemo(
    () => [
      {
        field: "social_name",
        headerName: "Nome",
        pinned: "left",
        cellRenderer: SocialNameRenderer,
        sortable: true,
      },
      {
        field: "full_name",
        headerName: profilePropMap("full_name"),
        sortable: true,
      },
      {
        field: "is_veteran",
        headerName: "Vet ou Nov?",
        headerTooltip: "Veterane ou Novate",
        cellRenderer: (params: { value: boolean | null }) =>
          params.value ? "Veterane" : "Novate",
        cellClass: (params) => getVeteranRookieColors(params.value),
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: isVeteranOptions,
          field: "is_veteran",
          model: isVeteranFilter,
          onModelChange: setIsVeteranFilter,
        },
      },
      {
        field: "attended_events_count",
        headerName: "Eventos",
        headerTooltip: "Quantidade de eventos",
        ...compactCell,
        cellClass: (params) =>
          `ag-cell-compact ${getEventCountColors(params.value)}`,
      },
      {
        field: "last_attended_event_title",
        headerName: "Último Evento",
        cellRenderer: LastAttendedEventRenderer,
        sortable: true,
      },
      {
        field: "flag",
        headerName: profilePropMap("flag"),
        headerTooltip: "Flag de atenção",
        cellRenderer: FlagBadgeRenderer,
        sortable: true,
        ...compactCell,
      },
      {
        field: "pronouns",
        headerName: profilePropMap("pronouns"),
        cellRenderer: PronounsRenderer,
        valueFormatter: (params) =>
          Array.isArray(params.value) ? params.value.join(", ") : "",
      },
      {
        field: "gender",
        headerName: profilePropMap("gender"),
        cellRenderer: WarningIndicatorRenderer,
        cellRendererParams: { type: "gender" },
        valueFormatter: (params) =>
          Array.isArray(params.value) ? params.value.join(", ") : "",
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: memoizedGenderOptions,
          field: "gender",
          model: genderFilter,
          onModelChange: setGenderFilter,
          matchMode: "array",
        },
      },
      {
        field: "orientation",
        headerName: profilePropMap("orientation"),
        cellRenderer: WarningIndicatorRenderer,
        cellRendererParams: { type: "orientation" },
        valueFormatter: (params) =>
          Array.isArray(params.value) ? params.value.join(", ") : "",
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: memoizedOrientationOptions,
          field: "orientation",
          model: orientationFilter,
          onModelChange: setOrientationFilter,
          matchMode: "array",
        },
      },
      {
        field: "phone",
        headerName: "",
        cellRenderer: PhoneButtonRenderer,
        ...compactCell,
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
          const option = applicationStatusOptions.find(
            (o) => o.value === params.value,
          )
          return option?.name || params.value
        },
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: applicationStatusOptions,
          field: "application_status",
          model: applicationStatusFilter,
          onModelChange: setApplicationStatusFilter,
        },
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
          const option = attendanceStatusOptions.find(
            (o) => o.value === params.value,
          )
          return option?.name || params.value
        },
        valueSetter: (params: ValueSetterParams<ProfileWithExtraData>) => {
          const newValue =
            params.newValue as ProfileWithExtraData["attendance_status"]

          if (newValue === params.data.attendance_status) {
            return false
          }

          params.data.attendance_status = newValue

          if (
            shouldAutoCheckWasSelectedForRotation(
              newValue,
              params.data.was_selected_for_rotation ?? false,
            )
          ) {
            params.data.was_selected_for_rotation = true
            if (params.node) {
              params.api.refreshCells({
                rowNodes: [params.node],
                columns: ["was_selected_for_rotation"],
              })
            }
          }

          return true
        },
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: attendanceStatusOptions,
          field: "attendance_status",
          model: attendanceStatusFilter,
          onModelChange: setAttendanceStatusFilter,
        },
      },
      {
        field: "was_selected_for_rotation",
        headerName: "Escolhide p/ rodízio?",
        headerTooltip: "Escolhide para rodízio neste evento",
        editable: true,
        cellEditor: "agCheckboxCellEditor",
        cellRenderer: "agCheckboxCellRenderer",
        ...compactCell,
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
          const option = approvedToAttendStatusOptions.find(
            (o) => o.value === params.value,
          )
          return option?.name || params.value
        },
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: approvedToAttendStatusOptions,
          field: "approved_to_attend",
          model: approvedToAttendFilter,
          onModelChange: setApprovedToAttendFilter,
        },
      },
      {
        field: "has_paid",
        headerName: "Pago?",
        headerTooltip: "Pagamento realizado",
        editable: true,
        cellEditor: "agCheckboxCellEditor",
        cellRenderer: "agCheckboxCellRenderer",
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: hasPaidOptions,
          field: "has_paid",
          model: hasPaidFilter,
          onModelChange: setHasPaidFilter,
        },
      },
      {
        field: "payment",
        headerName: eventParticipantPropMap("payment"),
        editable: true,
        cellEditor: "agNumberCellEditor",
        valueParser: (params) =>
          parsePaymentValue(params.newValue, params.oldValue),
        valueSetter: (params: ValueSetterParams<ProfileWithExtraData>) => {
          const parsedValue = parsePaymentValue(
            params.newValue,
            params.data.payment,
          )
          const newValue = parsedValue ?? 0

          if (newValue === params.data.payment) {
            return false
          }

          params.data.payment = newValue

          if (shouldAutoCheckHasPaid(newValue, params.data.has_paid ?? false)) {
            params.data.has_paid = true
            if (params.node) {
              params.api.refreshCells({
                rowNodes: [params.node],
                columns: ["has_paid"],
              })
            }
          }

          return true
        },
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
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: spotTypeOptions,
          field: "spot_type",
          model: spotTypeFilter,
          onModelChange: setSpotTypeFilter,
        },
      },
      {
        colId: "is_veteran_edit",
        field: "is_veteran",
        headerName: "Veterane?",
        headerTooltip: "Marcar como veterane",
        editable: true,
        cellEditor: "agCheckboxCellEditor",
        cellRenderer: "agCheckboxCellRenderer",
        ...compactCell,
      },
      {
        field: "companions",
        headerName: eventParticipantPropMap("companions"),
        cellRenderer: TextViewModalRenderer,
      },
      {
        field: "notes",
        headerName: eventParticipantPropMap("notes"),
        editable: true,
        cellEditor: "agLargeTextCellEditor",
        cellEditorParams: {
          maxLength: 1000,
          rows: 10,
          cols: 50,
        },
        cellEditorPopup: true,
      },
      {
        field: "admin_general_notes",
        headerName: eventParticipantPropMap("admin_general_notes"),
        editable: true,
        cellEditor: "agLargeTextCellEditor",
        cellEditorParams: {
          maxLength: 1000,
          rows: 10,
          cols: 50,
        },
        cellEditorPopup: true,
      },
      {
        field: "was_admin_skipped_last_event",
        headerName: "Foi rodízio na última festa?",
        cellRenderer: BooleanTextRenderer,
      },
      {
        colId: "actions",
        headerName: "",
        cellRenderer: ActionButtonsRenderer,
        pinned: "right",
        sortable: false,
        filter: false,
        ...compactCell,
      },
    ],
    [
      memoizedGenderOptions,
      memoizedOrientationOptions,
      applicationStatusFilter,
      attendanceStatusFilter,
      approvedToAttendFilter,
      genderFilter,
      orientationFilter,
      isVeteranFilter,
      hasPaidFilter,
      spotTypeFilter,
    ],
  )

  const handleClearFilters = useCallback(() => {
    setApplicationStatusFilter([])
    setAttendanceStatusFilter([])
    setApprovedToAttendFilter([])
    setGenderFilter([])
    setOrientationFilter([])
    setIsVeteranFilter([])
    setHasPaidFilter([])
    setSpotTypeFilter([])
  }, [])

  const { acceptedInProcess, applications } = countParticipants(participants)

  const tableHeader = (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-4 text-sm flex-wrap">
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
  )

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Inscrições</h2>
      <AGDataTable
        id="participants-table"
        data={participants}
        columnDefs={columnDefs}
        context={{ eventId }}
        getRowId={(params) => params.data.id}
        pagination
        paginationAutoPageSize
        quickFilterText={searchText}
        emptyMessage="Nenhum participante encontrado"
        persistState
        showToolbar
        onClearFilters={handleClearFilters}
        fetcher={fetcher}
        onSave={handleSave}
        onCellValueChanged={handleCellValueChanged}
        headerContent={tableHeader}
      />
    </div>
  )
}
