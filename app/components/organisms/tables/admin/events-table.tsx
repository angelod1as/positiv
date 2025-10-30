import { EyeIcon, PencilIcon } from "lucide-react"
import { Column } from "primereact/column"
import type { FC } from "react"
import { registerMultiSelectFilters } from "~/lib/helpers/register-filter-services"
import { useSessionStorageFilter } from "~/lib/hooks/use-session-storage-filter"
import { useTableFilters } from "~/lib/hooks/use-table-filters"
import { Button } from "~/components/atoms/button/button"
import { DataTable } from "~/components/organisms/tables/base/data-table"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import {
  eventPropNameMap,
  eventStatusMap,
  EVENTS_TABLE_FILTER_CONFIGS,
} from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { Event } from "~types/database/entities.types"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT, ADMIN_EDIT_EVENT, ADMIN_CREATE_EVENT },
  },
} = paths

registerMultiSelectFilters(EVENTS_TABLE_FILTER_CONFIGS)

type AdminDashboardEventsTableProps = {
  events: Event[]
}
export const AdminDashboardEventsTable: FC<AdminDashboardEventsTableProps> = ({
  events,
}) => {
  const [statusFilter, setStatusFilter] = useSessionStorageFilter(
    EVENTS_TABLE_FILTER_CONFIGS.event_status.storageKey,
    EVENTS_TABLE_FILTER_CONFIGS.event_status.defaultSelected || [],
  )

  const { filters, filterTemplates, handleFilter, handleClearFilters } =
    useTableFilters(EVENTS_TABLE_FILTER_CONFIGS, {
      event_status: [statusFilter, setStatusFilter],
    })

  return (
    <DataTable
      id="admin-events"
      data={events}
      filters={filters}
      onFilter={handleFilter}
      onClearFilters={handleClearFilters}
      header={{
        title: "Todos os eventos",
        elements: (
          <>
            <Button to={ADMIN_CREATE_EVENT}>Criar evento</Button>
          </>
        ),
      }}
      buttons={[
        {
          Icon: EyeIcon,
          to: ADMIN_VIEW_EVENT,
          title: "Ver evento",
        },
        {
          Icon: PencilIcon,
          to: ADMIN_EDIT_EVENT,
          title: "Editar evento",
        },
      ]}
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
