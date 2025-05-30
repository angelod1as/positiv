import type { FC } from "react"
import type { ParticipantWithExtraData } from "~/business/admin/admin.server"
import { DataTable } from "~/components/organisms/data-table/data-table"
import { adminEventParticipantsTableColumns } from "./admin-event-participants-table-columns"

type AdminEventParticipantsTableProps = {
  participants: ParticipantWithExtraData[]
  eventId: string
}
export const AdminEventParticipantsTable: FC<
  AdminEventParticipantsTableProps
> = ({ participants, eventId }) => {
  return (
    <DataTable
      data={participants}
      columns={adminEventParticipantsTableColumns}
      filterBy="Nome"
      context={{ eventId }}
    />
  )
}
