import { EyeIcon, PencilIcon } from "lucide-react"
import { FilterMatchMode } from "primereact/api"
import {
  Column,
  type ColumnFilterElementTemplateOptions,
} from "primereact/column"
import { Dropdown } from "primereact/dropdown"
import { type FC } from "react"
import { DataTable } from "~/components/organisms/data-table"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { eventPropNameMap, eventStatusMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { Event, EventStatus } from "~types/entities.types"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT, ADMIN_EDIT_EVENT },
  },
} = paths

const statusFilterTemplate = (options: ColumnFilterElementTemplateOptions) => {
  return (
    <Dropdown
      value={options.value}
      options={[
        "Draft",
        "Scheduled",
        "Registration Open",
        "Registration Closed",
        "Cancelled",
        "Completed",
      ].map((status) => ({
        label: eventStatusMap(status as EventStatus),
        value: status,
      }))}
      onChange={(e) => options.filterCallback(e.value, options.index)}
      placeholder="Selecione"
      className="p-column-filter"
      showClear
    />
  )
}

type AdminDashboardEventsTableProps = {
  events: Event[]
}
export const AdminDashboardEventsTable: FC<AdminDashboardEventsTableProps> = ({
  events,
}) => {
  return (
    <DataTable
      id="admin-events"
      value={events}
      filters={{
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        time_event_start: { value: null, matchMode: FilterMatchMode.CUSTOM },
        event_status: { value: null, matchMode: FilterMatchMode.EQUALS },
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
        filterElement={statusFilterTemplate}
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
