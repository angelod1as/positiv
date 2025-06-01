import type { ColumnDef } from "@tanstack/react-table"
import { EyeIcon } from "lucide-react"
import WhatsappIcon from "~/assets/social/whatsapp.svg"
import type { ParticipantWithExtraData } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import { DataTableColumnHeader } from "~/components/organisms/data-table/column-header"
import { selectionBox } from "~/components/organisms/data-table/selection-box"
import { phoneToWhatsappLink } from "~/lib/helpers/phone-to-whatsapp-link"

import paths from "~/lib/paths"
import type { TableMeta } from "~types/table.types"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

const joinArray = (array: unknown) =>
  Array.isArray(array) ? array.join(", ") : array

const phoneToButton = (phone: unknown) => {
  const link = phoneToWhatsappLink(phone)
  if (!link) return null
  return (
    <Button to={link} variant="outline" linkProps={{ target: "_blank" }}>
      <img src={WhatsappIcon} alt="Whatsapp" width={20} />
    </Button>
  )
}

export const adminEventParticipantsTableColumns: ColumnDef<ParticipantWithExtraData>[] =
  [
    selectionBox(),
    {
      id: "Nome",
      accessorKey: "full_name",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
    },
    {
      id: "Nome social",
      accessorKey: "social_name",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
    },
    {
      id: "Pronomes",
      accessorKey: "pronouns",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
      cell: ({ cell }) => joinArray(cell.getValue()),
    },
    {
      id: "Gênero",
      accessorKey: "gender",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
      cell: ({ cell }) => joinArray(cell.getValue()),
    },
    {
      id: "Orientação",
      accessorKey: "orientation",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
      cell: ({ cell }) => joinArray(cell.getValue()),
    },
    {
      id: "Whatsapp",
      accessorKey: "phone",
      // TODO: whatsapp link
      header: ({ column }) => <DataTableColumnHeader column={column} />,
      cell: ({ cell }) => phoneToButton(cell.getValue()),
      enableSorting: false,
    },
    {
      id: "Status",
      accessorKey: "process_status",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
    },
    {
      id: "Pagamento",
      accessorKey: "payment",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
    },
    {
      id: "Veterane?",
      accessorKey: "is_veteran",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
    },
    {
      id: "Vaga Social?",
      accessorKey: "is_social_spot",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
    },
    {
      id: "Foi rodízio?",
      accessorKey: "was_admin_skipped_last_event",
      header: ({ column }) => <DataTableColumnHeader column={column} />,
    },
    {
      id: "Ações",
      header: () => null,
      accessorKey: "id",
      meta: {
        className: "bg-white sticky right-0",
      },
      cell: ({ cell, table }) => {
        const participantId = cell.getValue() as string
        const { eventId } = (table.options.meta as TableMeta) || {}
        if (!eventId) return null
        return (
          <div className="flex gap-2 justify-self-end">
            <Button
              to={ADMIN_EVENT_VIEW_PARTICIPANT(eventId, participantId)}
              variant="outline"
            >
              <EyeIcon />
            </Button>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
