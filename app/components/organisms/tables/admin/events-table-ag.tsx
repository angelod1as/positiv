import type { ColDef, RowClickedEvent } from "ag-grid-community"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "~/components/atoms/button/button"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import {
  DEFAULT_EVENT_STATUS_FILTER,
  eventPropNameMap,
  eventStatusMap,
  eventStatusOptions,
} from "~/lib/helpers/propMaps"
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
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // Error parsing, fall back to default
    }
  }
  return DEFAULT_EVENT_STATUS_FILTER
}

export function AdminDashboardEventsTableAG({
  events,
}: AdminDashboardEventsTableAGProps) {
  const navigate = useNavigate()
  const [filterModel, setFilterModel] = useState<string[] | null>(
    getInitialFilterValues,
  )

  useEffect(() => {
    if (filterModel) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filterModel))
    }
  }, [filterModel])

  const filteredEvents = useMemo(() => {
    if (!filterModel || filterModel.length === 0) return events
    return events.filter((event) => filterModel.includes(event.event_status))
  }, [events, filterModel])

  const columnDefs: ColDef<DashboardEventAG>[] = useMemo(
    () => [
      {
        field: "title",
        headerName: eventPropNameMap("title"),
      },
      {
        field: "event_status",
        headerName: eventPropNameMap("event_status"),
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: eventStatusOptions,
          field: "event_status",
          model: filterModel,
          onModelChange: setFilterModel,
        },
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
    [filterModel],
  )

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<DashboardEventAG>) => {
      if (event.data?.id) {
        navigate(`/admin/eventos/${event.data.id}`)
      }
    },
    [navigate],
  )

  const handleClearFilters = useCallback(() => {
    setFilterModel(DEFAULT_EVENT_STATUS_FILTER)
  }, [])

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
        persistState
        showToolbar
        onClearFilters={handleClearFilters}
      />
    </div>
  )
}
