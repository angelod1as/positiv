import { Column } from "primereact/column"
import type { DataTableRowClickEvent } from "primereact/datatable"
import type { FC } from "react"
import { useNavigate } from "react-router"
import { Button } from "~/components/atoms/button/button"
import { DataTable } from "~/components/organisms/tables/base/data-table"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { registerMultiSelectFilters } from "~/lib/helpers/register-filter-services"
import {
  EVENTS_TABLE_FILTER_CONFIGS,
  eventPropNameMap,
  eventStatusMap,
} from "~/lib/helpers/propMaps"
import { useSessionStorageFilter } from "~/lib/hooks/use-session-storage-filter"
import { useTableFilters } from "~/lib/hooks/use-table-filters"
import paths from "~/lib/paths"
import type { Event } from "~types/database/entities.types"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT, ADMIN_CREATE_EVENT },
  },
} = paths

registerMultiSelectFilters(EVENTS_TABLE_FILTER_CONFIGS)

export type DashboardEvent = Pick<
  Event,
  "id" | "title" | "emoji" | "event_status" | "time_event_start"
>

type AdminDashboardEventsTableProps = {
  events: Event[] | DashboardEvent[]
}
export const AdminDashboardEventsTable: FC<AdminDashboardEventsTableProps> = ({
  events,
}) => {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useSessionStorageFilter(
    EVENTS_TABLE_FILTER_CONFIGS.event_status.storageKey,
    EVENTS_TABLE_FILTER_CONFIGS.event_status.defaultSelected || [],
  )

  const { filters, filterTemplates, handleFilter, handleClearFilters } =
    useTableFilters(EVENTS_TABLE_FILTER_CONFIGS, {
      event_status: [statusFilter, setStatusFilter],
    })

  const handleRowClick = (event: DataTableRowClickEvent) => {
    const eventData = event.data as Event | DashboardEvent
    navigate(ADMIN_VIEW_EVENT(eventData.id))
  }

  return (
    <DataTable
      id="admin-events"
      data={events}
      filters={filters}
      onFilter={handleFilter}
      onClearFilters={handleClearFilters}
      onRowClick={handleRowClick}
      header={{
        title: "Todos os eventos",
        elements: (
          <>
            <Button to={ADMIN_CREATE_EVENT}>Criar evento</Button>
          </>
        ),
      }}
    >
      <Column
        field="title"
        header={eventPropNameMap("title")}
        alignFrozen="left"
        sortable
        frozen={true}
      />
      <Column
        field="event_status"
        header={eventPropNameMap("event_status")}
        body={(value) => eventStatusMap(value.event_status)}
        filter
        filterElement={filterTemplates.event_status}
        filterField="event_status"
        showFilterMatchModes={false}
      />
      <Column
        field="time_event_start"
        header={eventPropNameMap("time_event_start")}
        body={(value) => formatDateTime(value.time_event_start).full}
        sortable
        // filter
        // filterElement={dateRowFilterTemplate}
        showFilterMatchModes={false}
        filterType="date"
        dataType="date"
      />
    </DataTable>
  )
}
