import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
} from "ag-grid-community"
import { EyeIcon } from "lucide-react"
import type { FC } from "react"
import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import { useFetcher } from "react-router"
import type { FeedbackWithVerification } from "~/business/feedback/feedback.server"
import {
  feedbackStatusLabels,
  feedbackStatusValues,
  type FeedbackStatus,
} from "~/business/feedback/feedback-schema"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { AGIconButton } from "~/components/organisms/tables/ag-grid/renderers/ag-icon-button"
import { TextViewModalRenderer } from "~/components/organisms/tables/ag-grid/renderers/text-view-modal-renderer"
import WhatsAppIcon from "~/assets/social/whatsapp.svg"
import { adminTablesCopy } from "~/copy/admin/tables"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { ComposableFetcherData } from "~types/database/entities.types"

interface FeedbacksTableProps {
  feedbacks: FeedbackWithVerification[]
}

const participationLabels: Record<string, string> = {
  never: adminTablesCopy.feedbacks.participation.never,
  once: adminTablesCopy.feedbacks.participation.once,
  more_than_once: adminTablesCopy.feedbacks.participation.moreThanOnce,
}

const participationFilterOptions = [
  { name: participationLabels.never, value: "never" },
  { name: participationLabels.once, value: "once" },
  { name: participationLabels.more_than_once, value: "more_than_once" },
]

const statusFilterOptions = feedbackStatusValues.map((value) => ({
  name: feedbackStatusLabels[value],
  value,
}))

const EDITABLE_FIELDS = ["status"] as const

const STORAGE_KEYS = {
  participation: "feedbacks-filter-participation",
  status: "feedbacks-filter-status",
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

function SocialNameRenderer(params: ICellRendererParams<FeedbackWithVerification>) {
  const { data } = params

  if (!data?.social_name) {
    return <>-</>
  }

  return <>{data.social_name}</>
}

function FullNameRenderer(params: ICellRendererParams<FeedbackWithVerification>) {
  const { data } = params

  if (!data?.full_name) {
    return <>-</>
  }

  return <>{data.full_name}</>
}

function ProfileButtonRenderer(params: ICellRendererParams<FeedbackWithVerification>) {
  const { data } = params

  if (!data?.profile_id) {
    return null
  }

  return (
    <AGIconButton
      href={paths.admin.ADMIN_VIEW_PARTICIPANT(data.profile_id)}
      title={adminTablesCopy.renderers.viewProfile}
    >
      <EyeIcon className="h-4 w-4" />
    </AGIconButton>
  )
}

function WhatsAppButtonRenderer(params: ICellRendererParams<FeedbackWithVerification>) {
  const whatsapp = params.value as string | null | undefined

  if (!whatsapp) return null

  const cleanedPhone = whatsapp.replace(/\D/g, "")
  const link =
    cleanedPhone.length === 11
      ? `https://wa.me/55${cleanedPhone}`
      : `https://wa.me/${cleanedPhone}`

  return (
    <AGIconButton
      href={link}
      title={adminTablesCopy.renderers.whatsapp}
      external
      className="border-green-500 hover:border-green-600 hover:bg-green-50"
    >
      <img src={WhatsAppIcon} alt={adminTablesCopy.renderers.whatsapp} className="h-4 w-4" />
    </AGIconButton>
  )
}

export const FeedbacksTable: FC<FeedbacksTableProps> = ({ feedbacks }) => {
  const gridApiRef = useRef<GridApi<FeedbackWithVerification> | null>(null)
  const fetcher = useFetcher<ComposableFetcherData>()
  const [participationFilter, setParticipationFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.participation),
  )
  const [statusFilter, setStatusFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.status),
  )

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEYS.participation,
      JSON.stringify(participationFilter),
    )
    sessionStorage.setItem(STORAGE_KEYS.status, JSON.stringify(statusFilter))
  }, [participationFilter, statusFilter])

  const handleSave = useCallback(
    async (params: { field: string; newValue: unknown; rowData: unknown }) => {
      const rowData = params.rowData as FeedbackWithVerification | undefined
      if (!rowData?.id) return

      if (
        !EDITABLE_FIELDS.includes(
          params.field as (typeof EDITABLE_FIELDS)[number],
        )
      ) {
        return
      }

      const formData = new FormData()
      formData.append("intent", "update-feedback-status")
      formData.append("id", rowData.id)
      formData.append(params.field, String(params.newValue ?? ""))

      fetcher.submit(formData, { method: "POST" })
    },
    [fetcher],
  )

  const columnDefs: ColDef<FeedbackWithVerification>[] = useMemo(
    () => [
      {
        field: "created_at",
        headerName: adminTablesCopy.feedbacks.columns.createdAt,
        valueFormatter: (params) =>
          formatDateTime(params.value, "numeric").date ?? "-",
        sortable: true,
        sort: "desc",
      },
      {
        field: "status",
        headerName: adminTablesCopy.feedbacks.columns.status,
        headerTooltip: adminTablesCopy.feedbacks.columns.statusTooltip,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: feedbackStatusValues,
        },
        valueFormatter: (params) =>
          feedbackStatusLabels[params.value as FeedbackStatus] ?? params.value,
        tooltipValueGetter: () => null,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: statusFilterOptions,
          field: "status",
          model: statusFilter,
          onModelChange: setStatusFilter,
        },
        sortable: true,
        width: 140,
      },
      {
        field: "has_participated",
        headerName: adminTablesCopy.feedbacks.columns.participation,
        valueFormatter: (params) =>
          participationLabels[params.value] || params.value,
        tooltipValueGetter: (params) =>
          participationLabels[params.value] || params.value,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: participationFilterOptions,
          field: "has_participated",
          model: participationFilter,
          onModelChange: setParticipationFilter,
        },
        sortable: true,
      },
      {
        field: "feedback_text",
        headerName: adminTablesCopy.feedbacks.columns.feedback,
        cellRenderer: TextViewModalRenderer,
        tooltipValueGetter: () => null,
        flex: 2,
      },
      {
        field: "social_name",
        headerName: adminTablesCopy.feedbacks.columns.socialName,
        headerTooltip: adminTablesCopy.feedbacks.columns.socialNameTooltip,
        cellRenderer: SocialNameRenderer,
        tooltipValueGetter: () => null,
        sortable: true,
      },
      {
        field: "full_name",
        headerName: adminTablesCopy.feedbacks.columns.fullName,
        headerTooltip: adminTablesCopy.feedbacks.columns.fullNameTooltip,
        cellRenderer: FullNameRenderer,
        tooltipValueGetter: () => null,
        sortable: true,
      },
      {
        field: "profile_id",
        headerName: adminTablesCopy.feedbacks.columns.profile,
        headerTooltip: adminTablesCopy.feedbacks.columns.profileTooltip,
        cellRenderer: ProfileButtonRenderer,
        tooltipValueGetter: () => null,
        sortable: false,
        width: 80,
      },
      {
        field: "whatsapp",
        headerName: adminTablesCopy.feedbacks.columns.whatsapp,
        cellRenderer: WhatsAppButtonRenderer,
        tooltipValueGetter: () => null,
        sortable: true,
        width: 100,
      },
      {
        field: "email",
        headerName: adminTablesCopy.feedbacks.columns.email,
        valueFormatter: (params) => params.value || "-",
        sortable: true,
      },
      {
        field: "can_contact",
        headerName: adminTablesCopy.feedbacks.columns.canContact,
        headerTooltip: adminTablesCopy.feedbacks.columns.canContactTooltip,
        valueFormatter: (params) => (params.value ? "✓" : "-"),
        tooltipValueGetter: () => null,
        sortable: true,
        width: 90,
      },
    ],
    [participationFilter, statusFilter],
  )

  const handleClearFilters = useCallback(() => {
    setParticipationFilter([])
    setStatusFilter([])
    Object.values(STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key))
  }, [])

  const handleGridReady = useCallback(
    (event: GridReadyEvent<FeedbackWithVerification>) => {
      gridApiRef.current = event.api
    },
    [],
  )

  return (
    <AGDataTable
      id="feedbacks"
      data={feedbacks}
      columnDefs={columnDefs}
      getRowId={(params) => params.data.id}
      emptyMessage={adminTablesCopy.feedbacks.emptyMessage}
      pagination
      paginationPageSize={25}
      showSearch
      searchPlaceholder={adminTablesCopy.feedbacks.searchPlaceholder}
      searchAriaLabel={adminTablesCopy.feedbacks.searchAriaLabel}
      showToolbar
      onClearFilters={handleClearFilters}
      onGridReady={handleGridReady}
      fetcher={fetcher}
      onSave={handleSave}
    />
  )
}
