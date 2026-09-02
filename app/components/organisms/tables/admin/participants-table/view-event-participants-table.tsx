import type {
  CellValueChangedEvent,
  ColDef,
  ICellRendererParams,
  IRowNode,
  ValueSetterParams,
} from "ag-grid-community"
import { DollarSign } from "lucide-react"
import type { FC } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { commitJson } from "~/components/forms/runtime/commit-json"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { getVeteranColumn } from "~/components/organisms/tables/ag-grid/columns/veteran-column"
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
import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import { adminEventsCopy } from "~/copy/admin/events"
import { adminTablesCopy } from "~/copy/admin/tables"
import { getEventCountColors } from "~/lib/helpers/cell-colors"
import { formatCurrency } from "~/lib/helpers/format-currency"
import {
  NO_PAYMENT_STATUS,
  isSettledPayment,
  paymentStatusFilterValue,
} from "~/lib/helpers/payment-status"
import {
  applicationStatusOptions,
  approvedToAttendStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  genderFilterOptions,
  orientationFilterOptions,
  paymentStatusOptions,
  paymentStatusPropMap,
  profilePropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"
import { CategoryLabelWithTooltip } from "./category-label-with-tooltip"
import { countParticipants } from "./count-participants"
import { eventCountComparator } from "./event-count-column-helpers"
import { shouldAutoCheckWasSelectedForRotation } from "./rotation-column-helpers"
import {
  acceptedInProcessTooltipContent,
  generalTooltipContent,
} from "./tooltip-contents"

const {
  admin: {
    events: { ADMIN_EVENT_PARTICIPANT_COMMIT },
  },
} = paths

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
  paymentStatus: "participants-filter-payment_status",
  spotType: "participants-filter-spot_type",
}

const tableCopy = adminTablesCopy.eventParticipants

const EDITABLE_FIELDS = [
  "application_status",
  "attendance_status",
  "approved_to_attend",
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
  onParticipantSaved?: () => void
  /** Opens the manage-payment modal on the row's participant. */
  onManagePayment?: (eventParticipantId: string) => void
}

export const AdminViewEventParticipantsTable: FC<
  AdminViewEventParticipantsTableProps
> = ({ participants, eventId, onParticipantSaved, onManagePayment }) => {
  const navigate = useNavigate()

  // What the toolbar's indicator used to read off the page's fetcher. Off the
  // fetcher there is no state to read, so the save keeps its own.
  const [saveState, setSaveState] = useState<{
    state: "idle" | "submitting"
    data: { success: boolean } | undefined
  }>({ state: "idle", data: undefined })

  // Two saves can be in flight at once: marking a row as skipped writes the
  // attendance status and the rotation flag that follows it. Whichever answers
  // last is not necessarily the last one asked, and the indicator should speak
  // for the newest save rather than the slowest.
  const latestSaveRef = useRef(0)

  const saveParticipant = useCallback(
    async (fields: Record<string, string>) => {
      const save = ++latestSaveRef.current
      setSaveState({ state: "submitting", data: undefined })

      // A save that never reached the server throws rather than answering, and
      // either way the admin is owed a line saying the cell was not written.
      const result = await commitJson(
        ADMIN_EVENT_PARTICIPANT_COMMIT,
        fields,
        (pathname) => void navigate(pathname),
      ).catch((): CommitResult => ({ ok: false, errors: [] }))

      if (save === latestSaveRef.current) {
        setSaveState({ state: "idle", data: { success: result.ok } })
      }

      if (!result.ok) {
        toast.error(
          result.message ?? adminEventsCopy.toasts.updateParticipantFailed,
        )
        return
      }

      toast.success(adminEventsCopy.toasts.updateParticipantSuccess)
      onParticipantSaved?.()
    },
    [navigate, onParticipantSaved],
  )

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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.paymentStatus),
  )
  const [spotTypeFilter, setSpotTypeFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.spotType),
  )

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
    sessionStorage.setItem(
      STORAGE_KEYS.paymentStatus,
      JSON.stringify(paymentStatusFilter),
    )
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
    paymentStatusFilter,
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

      await saveParticipant({
        id: rowData.id,
        profile_id: rowData.profile_id ?? "",
        [params.field]: String(params.newValue ?? ""),
      })
    },
    [saveParticipant],
  )

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ProfileWithExtraData>) => {
      // Auto-persist was_selected_for_rotation when transitioning to 'skipped'
      // This provides immediate persistence without waiting for DB trigger
      if (
        event.colDef.field === "attendance_status" &&
        event.oldValue !== "skipped" &&
        event.newValue === "skipped" &&
        event.data?.was_selected_for_rotation === true
      ) {
        void saveParticipant({
          id: event.data.id,
          profile_id: event.data.profile_id ?? "",
          was_selected_for_rotation: "true",
        })
      }
    },
    [saveParticipant],
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
        headerName: tableCopy.columns.socialName,
        pinned: "left",
        cellRenderer: SocialNameRenderer,
        sortable: true,
      },
      {
        field: "full_name",
        headerName: profilePropMap("full_name"),
        sortable: true,
      },
      getVeteranColumn({
        filterModel: isVeteranFilter,
        onFilterChange: setIsVeteranFilter,
        editable: true,
      }),
      {
        field: "attended_events_count",
        headerName: tableCopy.columns.attendedEventsCount,
        headerTooltip: tableCopy.columns.attendedEventsCountTooltip,
        sortable: true,
        sort: "desc",
        comparator: eventCountComparator,
        ...compactCell,
        cellClass: (params) =>
          `ag-cell-compact ${getEventCountColors(params.value)}`,
      },
      {
        field: "last_attended_events_count",
        headerName: tableCopy.columns.lastAttendedEventsCount,
        headerTooltip: tableCopy.columns.lastAttendedEventsCountTooltip,
        sortable: true,
        comparator: eventCountComparator,
        ...compactCell,
        cellClass: (params) =>
          `ag-cell-compact ${getEventCountColors(params.value)}`,
      },
      {
        field: "last_attended_event_title",
        headerName: tableCopy.columns.lastAttendedEventTitle,
        cellRenderer: LastAttendedEventRenderer,
        sortable: true,
      },
      {
        field: "flag",
        headerName: profilePropMap("flag"),
        headerTooltip: tableCopy.columns.flagTooltip,
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
        headerTooltip: tableCopy.columns.applicationStatusTooltip,
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
        headerTooltip: tableCopy.columns.attendanceStatusTooltip,
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
        headerName: tableCopy.columns.wasSelectedForRotation,
        headerTooltip: tableCopy.columns.wasSelectedForRotationTooltip,
        editable: true,
        cellEditor: "agCheckboxCellEditor",
        cellRenderer: "agCheckboxCellRenderer",
        ...compactCell,
      },
      {
        field: "approved_to_attend",
        headerName: profilePropMap("approved_to_attend"),
        headerTooltip: tableCopy.columns.approvedToAttendTooltip,
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
        field: "payment_status",
        headerName: tableCopy.columns.paymentStatus,
        headerTooltip: tableCopy.columns.paymentStatusTooltip,
        editable: false,
        // The cell and the filter read the same function on purpose: the
        // filter takes its value straight off the row, so pointing it at the
        // raw field while the cell mapped null itself would drop every unpaid
        // participant the moment a status was picked.
        valueGetter: (params) => paymentStatusFilterValue(params.data),
        valueFormatter: (params) =>
          params.value === NO_PAYMENT_STATUS
            ? tableCopy.columns.noAmount
            : paymentStatusPropMap(params.value),
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: paymentStatusOptions,
          getValue: (node: IRowNode<ProfileWithExtraData>) =>
            paymentStatusFilterValue(node.data),
          model: paymentStatusFilter,
          onModelChange: setPaymentStatusFilter,
        },
      },
      {
        field: "paid_gross",
        headerName: tableCopy.columns.paidGross,
        headerTooltip: tableCopy.columns.paidGrossTooltip,
        editable: false,
        // What the participant paid and Positiv still holds: the fees stay in,
        // because the participant paid them, and a refund comes out, because
        // it went back.
        valueGetter: (params) =>
          (params.data?.paid_gross ?? 0) - (params.data?.refunded ?? 0),
        // The amount is zero for a spot that owed nothing, for a participant
        // with no payment at all, and for a charge still waiting to be paid.
        // Only the first of those is an amount, and the status is what says so.
        valueFormatter: (params) =>
          isSettledPayment(params.data?.payment_status)
            ? formatCurrency(params.value ?? 0)
            : tableCopy.columns.noAmount,
      },
      {
        colId: "manage_payment",
        headerName: tableCopy.columns.managePaymentHeader,
        editable: false,
        sortable: false,
        filter: false,
        width: 60,
        cellRenderer: (params: ICellRendererParams<ProfileWithExtraData>) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label={tableCopy.columns.managePayment}
            onClick={() =>
              params.data && onManagePayment?.(params.data.id)
            }
          >
            <DollarSign className="h-4 w-4" />
          </Button>
        ),
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
        headerName: tableCopy.columns.wasAdminSkippedLastEvent,
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
      paymentStatusFilter,
      spotTypeFilter,
      onManagePayment,
    ],
  )

  const handleClearFilters = useCallback(() => {
    setApplicationStatusFilter([])
    setAttendanceStatusFilter([])
    setApprovedToAttendFilter([])
    setGenderFilter([])
    setOrientationFilter([])
    setIsVeteranFilter([])
    setPaymentStatusFilter([])
    setSpotTypeFilter([])
  }, [])

  const { acceptedInProcess, applications } = countParticipants(participants)

  const tableHeader = (
    <div className="flex items-center gap-4 text-sm flex-wrap">
      <p>
        <Copy inline>{tableCopy.header.applications(applications.total)}</Copy>
      </p>
      <p>
        <Copy inline>
          {tableCopy.header.acceptedInProcess(acceptedInProcess.total)}
        </Copy>
      </p>
      <span>|</span>
      <CategoryLabelWithTooltip
        label={tableCopy.header.generalLabel}
        tooltipContent={generalTooltipContent}
      />
      <p>
        <Copy inline>{tableCopy.header.rookies(applications.rookies)}</Copy>
      </p>
      <p>
        <Copy inline>{tableCopy.header.veterans(applications.veterans)}</Copy>
      </p>
      <span>|</span>
      <CategoryLabelWithTooltip
        label={tableCopy.header.acceptedInProcessLabel}
        tooltipContent={acceptedInProcessTooltipContent}
      />
      <p>
        <Copy inline>{tableCopy.header.rookies(acceptedInProcess.rookies)}</Copy>
      </p>
      <p>
        <Copy inline>
          {tableCopy.header.veterans(acceptedInProcess.veterans)}
        </Copy>
      </p>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{tableCopy.title}</h2>
      <AGDataTable
        id="participants-table"
        data={participants}
        columnDefs={columnDefs}
        context={{ eventId }}
        getRowId={(params) => params.data.id}
        pagination
        paginationAutoPageSize
        showSearch
        searchAriaLabel={tableCopy.searchAriaLabel}
        emptyMessage={tableCopy.emptyMessage}
        persistState
        stateVersion={3}
        suppressColumnVirtualisation
        showToolbar
        onClearFilters={handleClearFilters}
        fetcher={saveState}
        onSave={handleSave}
        onCellValueChanged={handleCellValueChanged}
        headerContent={tableHeader}
      />
    </div>
  )
}
