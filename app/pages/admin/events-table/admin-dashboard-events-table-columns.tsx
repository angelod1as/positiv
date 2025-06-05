import type { ColumnDef } from "@tanstack/react-table"
import { EyeIcon, PencilIcon, UsersIcon } from "lucide-react"
import { Button } from "~/components/atoms/button/button"
import { DataTableColumnHeader } from "~/components/organisms/data-table/column-header"
import { selectionBox } from "~/components/organisms/data-table/selection-box"

import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { Event } from "~types/entities.types"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT, ADMIN_EDIT_EVENT, ADMIN_EVENT_PARTICIPANTS },
  },
} = paths

export const adminDashboardEventsTableColumns: ColumnDef<Event>[] = [
  selectionBox(),
  {
    id: "Título",
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Título" />
    ),
  },
  {
    id: "Data de início",
    accessorKey: "time_event_start",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de início" />
    ),
    cell: ({ cell }) => {
      const value = cell.getValue()
      if (!value) return null
      return formatDateTime(value as string).full
    },
  },
  {
    id: "Ações",
    header: () => null,
    accessorKey: "id",
    cell: ({ cell }) => {
      const eventId = cell.getValue() as string
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
    },
    enableSorting: false,
    enableHiding: false,
  },
]
