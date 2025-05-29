import type { ColumnDef } from "@tanstack/react-table"
import { EyeIcon, PencilIcon, UsersIcon } from "lucide-react"
import { Button } from "~/components/atoms/button/button"
import { Checkbox } from "~/components/ui/checkbox"

import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { Event } from "~types/entities.types"
import { DataTableColumnHeader } from "./column-header"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT, ADMIN_EDIT_EVENT, ADMIN_EVENT_PARTICIPANTS },
  },
} = paths

export const adminDashboardEventsTableColumns: ColumnDef<Event>[] = [
  {
    id: "Seleção",
    header: ({ table }) => {
      return (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            table.getIsSomePageRowsSelected()
          }
          onChange={(event) =>
            table.toggleAllPageRowsSelected(!!event.target.checked)
          }
          aria-label="Select all"
        />
      )
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={(event) => {
          return row.toggleSelected(!!event.target.checked)
        }}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
