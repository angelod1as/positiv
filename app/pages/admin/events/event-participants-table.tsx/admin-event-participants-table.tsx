import type { FC } from "react"
import { Form, useForm } from "react-hook-form"
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
  const { control } = useForm({
    defaultValues: participants,
  })

  return (
    <Form control={control}>
      <DataTable
        data={participants}
        columns={adminEventParticipantsTableColumns}
        filterBy="Nome"
        context={{ eventId }}
      />
    </Form>
  )
}
