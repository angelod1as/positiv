import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
} from "ag-grid-community"
import type { FC } from "react"
import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import type { FeedbackWithVerification } from "~/business/feedback/feedback.server"
import { Link } from "~/components/atoms/link/link"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { AGIconButton } from "~/components/organisms/tables/ag-grid/renderers/ag-icon-button"
import { TextViewModalRenderer } from "~/components/organisms/tables/ag-grid/renderers/text-view-modal-renderer"
import WhatsAppIcon from "~/assets/social/whatsapp.svg"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"

interface FeedbacksTableProps {
  feedbacks: FeedbackWithVerification[]
}

const participationLabels: Record<string, string> = {
  never: "Nunca",
  once: "Uma vez",
  more_than_once: "Mais de uma vez",
}

const participationFilterOptions = [
  { name: "Nunca", value: "never" },
  { name: "Uma vez", value: "once" },
  { name: "Mais de uma vez", value: "more_than_once" },
]

const verificationFilterOptions = [
  { name: "Verificado", value: "true" },
  { name: "Não verificado", value: "false" },
]

const STORAGE_KEYS = {
  participation: "feedbacks-filter-participation",
  verification: "feedbacks-filter-verification",
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

function ProfileLinkRenderer(params: ICellRendererParams<FeedbackWithVerification>) {
  const { data } = params

  if (!data?.is_verified || !data.profile_id) {
    return null
  }

  const displayName = data.social_name || data.full_name?.split(" ")[0] || "Ver perfil"

  return (
    <Link to={paths.admin.ADMIN_VIEW_PARTICIPANT(data.profile_id)}>
      {data.social_name ? displayName : <i>{displayName}</i>}
    </Link>
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
      title="WhatsApp"
      external
      className="border-green-500 hover:border-green-600 hover:bg-green-50"
    >
      <img src={WhatsAppIcon} alt="WhatsApp" className="h-4 w-4" />
    </AGIconButton>
  )
}

export const FeedbacksTable: FC<FeedbacksTableProps> = ({ feedbacks }) => {
  const gridApiRef = useRef<GridApi<FeedbackWithVerification> | null>(null)
  const [participationFilter, setParticipationFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.participation),
  )
  const [verificationFilter, setVerificationFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.verification),
  )

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEYS.participation,
      JSON.stringify(participationFilter),
    )
    sessionStorage.setItem(
      STORAGE_KEYS.verification,
      JSON.stringify(verificationFilter),
    )
  }, [participationFilter, verificationFilter])

  const columnDefs: ColDef<FeedbackWithVerification>[] = useMemo(
    () => [
      {
        field: "created_at",
        headerName: "Data",
        valueFormatter: (params) =>
          formatDateTime(params.value, "numeric").date ?? "-",
        sortable: true,
        sort: "desc",
      },
      {
        field: "name",
        headerName: "Nome",
        valueFormatter: (params) => params.value || "Anônimo",
        sortable: true,
      },
      {
        field: "email",
        headerName: "E-mail",
        valueFormatter: (params) => params.value || "-",
        sortable: true,
      },
      {
        field: "whatsapp",
        headerName: "WhatsApp",
        cellRenderer: WhatsAppButtonRenderer,
        sortable: true,
        width: 100,
      },
      {
        field: "has_participated",
        headerName: "Participação",
        valueFormatter: (params) =>
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
        headerName: "Feedback",
        cellRenderer: TextViewModalRenderer,
        tooltipValueGetter: () => null,
        flex: 2,
      },
      {
        field: "can_contact",
        headerName: "Contato?",
        headerTooltip: "Autorizou contato por WhatsApp ou e-mail",
        valueFormatter: (params) => (params.value ? "✓" : "-"),
        sortable: true,
        width: 90,
      },
      {
        field: "is_verified",
        headerName: "Perfil",
        headerTooltip: "O e-mail ou telefone está no nosso banco de dados?",
        cellRenderer: ProfileLinkRenderer,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: verificationFilterOptions,
          field: "is_verified",
          model: verificationFilter,
          onModelChange: setVerificationFilter,
          valueGetter: (data: FeedbackWithVerification) =>
            String(data.is_verified),
        },
        sortable: true,
      },
    ],
    [participationFilter, verificationFilter],
  )

  const handleClearFilters = useCallback(() => {
    setParticipationFilter([])
    setVerificationFilter([])
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
      emptyMessage="Nenhum feedback encontrado"
      pagination
      paginationPageSize={25}
      showSearch
      searchPlaceholder="Buscar feedbacks..."
      searchAriaLabel="Buscar feedbacks"
      showToolbar
      onClearFilters={handleClearFilters}
      onGridReady={handleGridReady}
    />
  )
}
