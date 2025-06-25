import type { ColumnDef } from "@tanstack/react-table"
import { EyeIcon, PencilIcon } from "lucide-react"
import { Button } from "~/components/atoms/button/button"
import { DataTableColumnHeader } from "~/components/organisms/data-table/column-header"
import { selectionBox } from "~/components/organisms/data-table/selection-box"

import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { Newsletter } from "~types/entities.types"

const {
  admin: {
    newsletters: { ADMIN_VIEW_NEWSLETTER, ADMIN_EDIT_NEWSLETTER },
  },
} = paths

export const adminDashboardNewslettersTableColumns: ColumnDef<Newsletter>[] = [
  selectionBox(),
  {
    id: "Assunto",
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assunto" />
    ),
  },
  {
    id: "Audiência",
    accessorKey: "audience",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Audiência" />
    ),
  },
  {
    id: "Status",
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
  },
  {
    id: "Criado em",
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Criado em" />
    ),
    cell: ({ cell }) => {
      const value = cell.getValue() as string
      return formatDateTime(value).full
    },
  },
  {
    id: "Enviado em",
    accessorKey: "sent_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Enviado em" />
    ),
    cell: ({ cell }) => {
      const value = cell.getValue() as string | null
      return value ? formatDateTime(value).full : "-"
    },
  },
  {
    id: "Ações",
    accessorKey: "id",
    header: () => null,
    cell: ({ cell }) => {
      const id = cell.getValue() as string
      return (
        <div className="flex gap-2 justify-self-end">
          <Button to={ADMIN_VIEW_NEWSLETTER(id)} variant="outline" aria-label="Ver newsletter">
            <EyeIcon />
          </Button>
          <Button to={ADMIN_EDIT_NEWSLETTER(id)} variant="outline" aria-label="Editar newsletter">
            <PencilIcon />
          </Button>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]