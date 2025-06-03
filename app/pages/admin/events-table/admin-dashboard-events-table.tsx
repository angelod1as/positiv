import { EyeIcon, PencilIcon, UsersIcon } from "lucide-react"
import { Column } from "primereact/column"
import { DataTable } from "primereact/datatable"
import { useState, type FC } from "react"
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

const columns: Array<{
  field: keyof Event
  header: string
  transform?: (value: Event) => string
}> = [
  { field: "id", header: "Id" },
  { field: "title", header: "Title" },
  {
    field: "time_event_start",
    header: "Data de início",
    transform: (value) => {
      return formatDateTime(value.time_event_start).full || ""
    },
  },
]

const buttons = (value: Event) => {
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
}

export const AdminDashboardEventsTable: FC<AdminDashboardEventsTableProps> = ({
  events,
}) => {
  const [selection, setSelection] = useState<Event[]>([])
  return (
    <div className="z-50 ">
      <DataTable<Event[]>
        value={events}
        scrollable
        scrollHeight="400px"
        stripedRows
        paginator
        rows={150}
        tableStyle={{ minWidth: "50rem" }}
        sortMode="multiple"
        removableSort
        sortField="time_event_start"
        sortOrder={-1}
        selection={selection}
        onSelectionChange={(e) => setSelection(e.value)}
        selectionMode="checkbox"
        dataKey="id"
        resizableColumns
        columnResizeMode="fit"
        stateStorage="session"
        stateKey="dt-state-admin-events"
        emptyMessage="Nenhum evento encontrado"
      >
        <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />

        {columns.map((col) => (
          <Column
            key={col.field}
            field={col.field}
            header={col.header}
            sortable
            body={col.transform ? col.transform : undefined}
          />
        ))}
        <Column body={buttons} />
      </DataTable>
    </div>
  )
}
