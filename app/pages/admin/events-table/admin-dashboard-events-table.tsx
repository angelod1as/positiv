import { EyeIcon, PencilIcon, UsersIcon } from "lucide-react"
import { FilterMatchMode, FilterService } from "primereact/api"
import {
  Column,
  type ColumnFilterElementTemplateOptions,
} from "primereact/column"
import { DataTable, type DataTableFilterMeta } from "primereact/datatable"
import { Dropdown } from "primereact/dropdown"
import { InputText } from "primereact/inputtext"
import { useState, type ChangeEvent, type FC } from "react"
import { Button } from "~/components/atoms/button/button"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { eventPropNameMap, eventStatusMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { Event, EventStatus } from "~types/entities.types"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT, ADMIN_EDIT_EVENT, ADMIN_EVENT_PARTICIPANTS },
  },
} = paths

// TODO: Implement date filtering
FilterService.register("custom_time_event_start", (_value, _filters) => {
  // const [from, to] = filters ?? [null, null];
  // if (from === null && to === null) return true;
  // if (from !== null && to === null) return from <= value;
  // if (from === null && to !== null) return value <= to;
  // return from <= value && value <= to;
  return true
})

type AdminDashboardEventsTableProps = {
  events: Event[]
}
export const AdminDashboardEventsTable: FC<AdminDashboardEventsTableProps> = ({
  events: dbEvents,
}) => {
  const [selection, setSelection] = useState<Event[]>([])
  const [events, setEvents] = useState(dbEvents)

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    time_event_start: { value: null, matchMode: FilterMatchMode.CUSTOM },
    event_status: { value: null, matchMode: FilterMatchMode.EQUALS },
  })

  const [globalFilterValue, setGlobalFilterValue] = useState("")

  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const stateFilters = { ...filters }

    if ("value" in stateFilters["global"]) {
      stateFilters["global"].value = value
      setFilters(stateFilters)
      setGlobalFilterValue(value)
    }
  }

  const renderHeader = () => {
    return (
      <div className="flex justify-content-end">
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder="Buscar..."
        />
      </div>
    )
  }

  //// See top todo
  // const dateRowFilterTemplate = (
  //   options: ColumnFilterElementTemplateOptions,
  // ) => {
  //   return (
  //     <Input
  //       type="date"
  //       value={options.value || ""}
  //       onChange={(e) => options.filterApplyCallback(e.target.value)}
  //     />
  //   )
  // }

  const statusFilterTemplate = (
    options: ColumnFilterElementTemplateOptions,
  ) => {
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

  return (
    <DataTable
      value={events}
      paginator
      rows={150}
      dataKey="id"
      emptyMessage="Nenhum evento encontrado"
      // Filters
      filters={filters}
      filterDisplay="menu"
      onFilter={(e) => setFilters(e.filters)}
      globalFilterFields={["title"]}
      header={renderHeader}
      // Session
      // TODO: After fixing
      stateStorage="session"
      stateKey="dt-state-admin-events"
      // Scroll
      scrollable
      scrollHeight="400"
      stripedRows
      // Sorting
      sortField="time_event_start"
      sortOrder={1}
      removableSort
      // Selection
      selection={selection}
      onSelectionChange={(e) => setSelection(e.value)}
      selectionMode="checkbox"
      // Resize
      resizableColumns
      columnResizeMode="fit"
      // Reorder
      reorderableColumns
      onRowReorder={(e) => setEvents(e.value)}
    >
      <Column
        selectionMode="multiple"
        headerStyle={{ width: "3rem" }}
        alignFrozen="left"
      />
      <Column field="id" header="id" hidden={true} />
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
        //// See top todo
        // filter
        // filterElement={dateRowFilterTemplate}
        showFilterMatchModes={false}
        filterType="date"
        dataType="date"
      />

      {/* Buttons */}
      <Column
        body={(value: Event) => {
          const eventId = value.id
          return (
            <div className="flex gap-2 justify-self-end">
              <Button to={ADMIN_EVENT_PARTICIPANTS(eventId)} variant="outline">
                <UsersIcon />
              </Button>
              <Button to={ADMIN_VIEW_EVENT(eventId)} variant="outline">
                <EyeIcon />
              </Button>
              <Button to={ADMIN_EDIT_EVENT(eventId)} variant="outline">
                <PencilIcon />
              </Button>
            </div>
          )
        }}
      />
    </DataTable>
  )
}
