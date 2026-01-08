import { useMemo, useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router"
import type { ColDef, RowClickedEvent } from "ag-grid-community"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { Button } from "~/components/atoms/button/button"
import {
  eventStatusMap,
  eventStatusOptions,
  DEFAULT_EVENT_STATUS_FILTER,
} from "~/lib/helpers/propMaps"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { Event, EventStatus } from "~types/database/entities.types"

export type DashboardEventAG = Pick<
  Event,
  "id" | "title" | "emoji" | "event_status" | "time_event_start"
>

interface AdminDashboardEventsTableAGProps {
  events: DashboardEventAG[]
}

const STORAGE_KEY = "admin-events-ag-filter-status"

function getInitialFilterValues(): EventStatus[] {
  if (typeof window === "undefined") return DEFAULT_EVENT_STATUS_FILTER
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return DEFAULT_EVENT_STATUS_FILTER
    }
  }
  return DEFAULT_EVENT_STATUS_FILTER
}

export function AdminDashboardEventsTableAG({
  events,
}: AdminDashboardEventsTableAGProps) {
  const navigate = useNavigate()
  const [filterModel, setFilterModel] = useState<string[] | null>(
    getInitialFilterValues
  )

  useEffect(() => {
    if (filterModel) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filterModel))
    }
  }, [filterModel])

  const filteredEvents = useMemo(() => {
    if (!filterModel || filterModel.length === 0) return events
    return events.filter((event) =>
      filterModel.includes(event.event_status)
    )
  }, [events, filterModel])

  const columnDefs: ColDef<DashboardEventAG>[] = useMemo(
    () => [
      {
        field: "title",
        headerName: "Nome",
        pinned: "left",
        sortable: true,
        minWidth: 200,
        flex: 1,
      },
      {
        field: "event_status",
        headerName: "Status",
        sortable: true,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: eventStatusOptions,
          field: "event_status",
          model: filterModel,
          onModelChange: setFilterModel,
        },
        cellRenderer: (params: { value: EventStatus }) =>
          eventStatusMap(params.value),
        minWidth: 150,
      },
      {
        field: "time_event_start",
        headerName: "Início do evento",
        sortable: true,
        cellRenderer: (params: { value: string | null }) =>
          formatDateTime(params.value)?.full ?? "",
        minWidth: 200,
      },
    ],
    [filterModel]
  )

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<DashboardEventAG>) => {
      if (event.data?.id) {
        navigate(`/admin/eventos/${event.data.id}`)
      }
    },
    [navigate]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Todos os eventos</h2>
        <Button to="/admin/eventos/criar" linkProps={{ prefetch: "intent" }}>
          Criar evento
        </Button>
      </div>
      <AGDataTable
        id="admin-events-ag"
        data={filteredEvents}
        columnDefs={columnDefs}
        pagination
        paginationPageSize={25}
        paginationPageSizeSelector={[10, 25, 50, 100]}
        onRowClicked={handleRowClicked}
        emptyMessage="Nenhum evento encontrado"
      />
    </div>
  )
}
