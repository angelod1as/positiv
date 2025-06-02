import type {
  CellContext,
  ColumnDef,
  HeaderContext,
} from "@tanstack/react-table"
import { EyeIcon } from "lucide-react"
import WhatsappIcon from "~/assets/social/whatsapp.svg"
import type { ParticipantWithExtraData } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import { DataTableColumnHeader } from "~/components/organisms/data-table/column-header"
import { selectionBox } from "~/components/organisms/data-table/selection-box"
import { phoneToWhatsappLink } from "~/lib/helpers/phone-to-whatsapp-link"

import { makeInput } from "~/components/organisms/data-table/make-input"
import { numberBox } from "~/components/organisms/data-table/number-box"
import { participantProcessStatusPropMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { TableMeta } from "~/types/table.types"
import { participantProcessStatus } from "~types/entities.types"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

type Ctx = CellContext<ParticipantWithExtraData, unknown>
type HeaderCtx = HeaderContext<ParticipantWithExtraData, unknown>

const joinArray = (ctx: Ctx) => {
  const value = ctx.getValue()
  return Array.isArray(value) ? value.join(", ") : value
}

const phoneToButton = (ctx: Ctx) => {
  const value = ctx.getValue()
  const link = phoneToWhatsappLink(value)
  if (!link) return null
  return (
    <Button to={link} variant="outline" linkProps={{ target: "_blank" }}>
      <img src={WhatsappIcon} alt="Whatsapp" width={20} />
    </Button>
  )
}

const makeHeader = (ctx: HeaderCtx) => {
  const column = ctx.column
  return <DataTableColumnHeader column={column} />
}

const makeSubmitObj = (ctx: CellContext<ParticipantWithExtraData, unknown>) => {
  return {
    participantId: ctx.row.original.id,
  }
}

export const adminEventParticipantsTableColumns: ColumnDef<ParticipantWithExtraData>[] =
  [
    numberBox(),
    selectionBox(),
    {
      id: "Nome",
      accessorKey: "full_name",
      header: makeHeader,
    },
    {
      id: "Nome social",
      accessorKey: "social_name",
      header: makeHeader,
    },
    {
      id: "Pronomes",
      accessorKey: "pronouns",
      header: makeHeader,
      cell: joinArray,
    },
    {
      id: "Gênero",
      accessorKey: "gender",
      header: makeHeader,
      cell: joinArray,
    },
    {
      id: "Orientação",
      accessorKey: "orientation",
      header: makeHeader,
      cell: joinArray,
    },
    {
      id: "Whatsapp",
      accessorKey: "phone",
      header: makeHeader,
      cell: phoneToButton,
      enableSorting: false,
    },
    {
      id: "Status",
      accessorKey: "process_status",
      header: makeHeader,
      cell: (ctx) =>
        makeInput(ctx, {
          submitObject: makeSubmitObj(ctx),
          type: "select",
          selectOptions: participantProcessStatus.map((status) => ({
            label: participantProcessStatusPropMap(status),
            value: status,
          })),
        }),
    },
    {
      id: "Pagamento",
      accessorKey: "payment",
      header: makeHeader,
      cell: (ctx) =>
        makeInput(ctx, { submitObject: makeSubmitObj(ctx), type: "money" }),
    },
    {
      id: "Veterane?",
      accessorKey: "is_veteran",
      header: makeHeader,
      cell: (ctx) =>
        makeInput(ctx, { submitObject: makeSubmitObj(ctx), type: "checkbox" }),
    },
    {
      id: "Vaga Social?",
      accessorKey: "is_social_spot",
      header: makeHeader,
      cell: (ctx) =>
        makeInput(ctx, { submitObject: makeSubmitObj(ctx), type: "checkbox" }),
    },
    {
      id: "Foi rodízio?",
      accessorKey: "was_admin_skipped_last_event",
      header: makeHeader,
      cell: (ctx) =>
        makeInput(ctx, { submitObject: makeSubmitObj(ctx), type: "checkbox" }),
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
