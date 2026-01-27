import type { ColDef } from "ag-grid-community"
import type { FC } from "react"
import { useMemo } from "react"
import type { FeedbackWithVerification } from "~/business/feedback/feedback.server"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { TextViewModalRenderer } from "~/components/organisms/tables/ag-grid/renderers/text-view-modal-renderer"
import { formatDateTime } from "~/lib/helpers/format-date-time"

interface FeedbacksTableProps {
  feedbacks: FeedbackWithVerification[]
}

const participationLabels: Record<string, string> = {
  never: "Nunca",
  once: "Uma vez",
  more_than_once: "Mais de uma vez",
}

export const FeedbacksTable: FC<FeedbacksTableProps> = ({ feedbacks }) => {
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
        valueFormatter: (params) => params.value || "-",
        sortable: true,
      },
      {
        field: "has_participated",
        headerName: "Participação",
        valueFormatter: (params) =>
          participationLabels[params.value] || params.value,
        sortable: true,
      },
      {
        field: "feedback_text",
        headerName: "Feedback",
        cellRenderer: TextViewModalRenderer,
        flex: 2,
      },
      {
        field: "is_verified",
        headerName: "Verificado",
        valueFormatter: (params) => (params.value ? "✓" : "-"),
        sortable: true,
      },
    ],
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
    />
  )
}
