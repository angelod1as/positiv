import type { ColDef } from "ag-grid-community"
import type { FC } from "react"
import { useMemo } from "react"
import type { FeedbackWithVerification } from "~/business/feedback/feedback.server"
import {
  feedbackStatusLabels,
  type FeedbackStatus,
} from "~/business/feedback/feedback-schema"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { TruncatedTextRenderer } from "~/components/organisms/tables/ag-grid/renderers/truncated-text-renderer"
import { formatDateTime } from "~/lib/helpers/format-date-time"

interface RecentFeedbacksTableProps {
  feedbacks: FeedbackWithVerification[]
}

export const RecentFeedbacksTable: FC<RecentFeedbacksTableProps> = ({
  feedbacks,
}) => {
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
        field: "feedback_text",
        headerName: "Feedback",
        cellRenderer: TruncatedTextRenderer,
        flex: 2,
      },
      {
        field: "status",
        headerName: "Status",
        valueFormatter: (params) =>
          feedbackStatusLabels[params.value as FeedbackStatus] ?? params.value,
        sortable: true,
      },
    ],
    [],
  )

  return (
    <AGDataTable
      id="recent-feedbacks"
      data={feedbacks}
      columnDefs={columnDefs}
      getRowId={(params) => params.data.id}
      emptyMessage="Nenhum feedback recente"
      height="400"
      showToolbar={false}
      persistState={false}
    />
  )
}
