/**
 * AG Grid Events Table - Admin Dashboard
 *
 * Uses AG Grid for filtering, sorting, and pagination.
 */
import type { ColDef, RowClickedEvent } from "ag-grid-community"
import { Search } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "~/components/atoms/button/button"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { Input } from "~/components/ui/input"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import {
  eventPropNameMap,
  eventStatusMap,
} from "~/lib/helpers/propMaps"
import type { Event, EventStatus } from "~types/database/entities.types"

export type DashboardEvent = Pick<
  Event,
  "id" | "title" | "emoji" | "event_status" | "time_event_start"
>

interface AdminDashboardEventsTableProps {
  events: DashboardEvent[]
}

export function AdminDashboardEventsTable({
  events,
}: AdminDashboardEventsTableProps) {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState("")

  const columnDefs: ColDef<DashboardEvent>[] = useMemo(
    () => [
      {
        field: "title",
        headerName: eventPropNameMap("title"),
      },
      {
        field: "event_status",
        headerName: eventPropNameMap("event_status"),
        cellRenderer: (params: { value: EventStatus }) =>
          eventStatusMap(params.value),
      },
      {
        field: "time_event_start",
        headerName: eventPropNameMap("time_event_start"),
        sort: "desc",
        cellRenderer: (params: { value: string | null }) =>
          formatDateTime(params.value)?.full ?? "",
      },
    ],
    [],
  )

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<DashboardEvent>) => {
      if (event.data?.id) {
        navigate(`/admin/eventos/${event.data.id}`)
      }
    },
    [navigate],
  )

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
          aria-label="Buscar eventos"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Todos os eventos</h2>
        <Button to="/admin/eventos/novo" linkProps={{ prefetch: "intent" }}>
          Criar evento
        </Button>
      </div>
      <AGDataTable
        id="admin-events"
        data={events}
        columnDefs={columnDefs}
        pagination
        paginationPageSize={25}
        paginationPageSizeSelector={[10, 25, 50, 100]}
        onRowClicked={handleRowClicked}
        emptyMessage="Nenhum evento encontrado"
        persistState={false}
        showToolbar
        headerContent={tableHeader}
        quickFilterText={searchText}
      />
    </div>
  )
}
