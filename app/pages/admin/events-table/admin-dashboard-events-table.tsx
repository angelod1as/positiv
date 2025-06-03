import { EyeIcon, PencilIcon, UsersIcon } from "lucide-react"
import { FilterMatchMode } from "primereact/api"
import { Column } from "primereact/column"
import { DataTable, type DataTableFilterMeta } from "primereact/datatable"
import { InputText } from "primereact/inputtext"
import { useState, type ChangeEvent, type FC } from "react"
import { Button } from "~/components/atoms/button/button"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { Event } from "~types/entities.types"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT, ADMIN_EDIT_EVENT, ADMIN_EVENT_PARTICIPANTS },
  },
} = paths

type AdminDashboardEventsTableProps = {
  events: Event[]
}
export const AdminDashboardEventsTable: FC<AdminDashboardEventsTableProps> = ({
  events,
}) => {
  const [selection, setSelection] = useState<Event[]>([])

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
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

  return (
    <DataTable
      value={events}
      paginator
      rows={150}
      dataKey="id"
      emptyMessage="Nenhum evento encontrado"
      // Filters
      filters={filters}
      filterDisplay="row"
      onFilter={(e) => setFilters(e.filters)}
      header={renderHeader}
      // Session
      // TODO: After fixing
      // stateStorage="session"
      // stateKey="dt-state-admin-events"
      // Scroll
      scrollable
      scrollHeight="400"
      stripedRows
      // Sorting
      sortField="time_event_start"
      sortOrder={-1}
      // Selection
      selection={selection}
      onSelectionChange={(e) => setSelection(e.value)}
      selectionMode="checkbox"
      // Resize
      resizableColumns
      columnResizeMode="fit"
    >
      <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
      <Column field="id" header="id" hidden={true} />
      <Column field="title" header="Título" alignFrozen="left" frozen={true} />
      <Column
        field="time_event_start"
        header="Data de início"
        body={(value) => formatDateTime(value.time_event_start).full}
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
