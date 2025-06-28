import { EyeIcon } from "lucide-react"
import { Column } from "primereact/column"
import type { FC } from "react"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { DataTable } from "~/components/organisms/data-table"
import { PhoneButton } from "~/lib/helpers/phone-to-button"
import paths from "~/lib/paths"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

type AdminEventParticipantsTableProps = {
  participants: ProfileWithExtraData[]
  eventId: string
}

const joinArray = (
  values: ProfileWithExtraData,
  prop: keyof ProfileWithExtraData,
) => {
  const value = values[prop]
  return Array.isArray(value) ? value.join(", ") : value
}

// const booleanBodyTemplate = (
//   values: ParticipantWithExtraData,
//   prop: keyof ParticipantWithExtraData,
// ) => {
//   const value = values[prop]
//   return <Checkbox checked={Boolean(value)} disabled />
// }

const isParticipantAccepted = (participant: ProfileWithExtraData) => {
  return ["sent_payment_data", "paid", "sent_rules"].includes(
    participant.process_status,
  )
}

export const AdminEventParticipantsTable: FC<
  AdminEventParticipantsTableProps
> = ({ participants, eventId }) => {
  const accepted = participants.filter(isParticipantAccepted)
  return (
    <DataTable
      value={participants}
      id="participants"
      sortField="time_event_start"
      header={{
        title: "Inscrições",
        numbers: (
          <>
            <p>
              <b>{participants.length}</b> inscrites
            </p>
            <p>
              <b>{accepted.length}</b> aceites
            </p>
          </>
        ),
      }}
      buttons={[
        {
          Icon: EyeIcon,
          to(id) {
            return ADMIN_EVENT_VIEW_PARTICIPANT(eventId, id)
          },
          title: "Ver participante",
          key: "id",
        },
      ]}
    >
      <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />

      <Column field="full_name" header="Nome" frozen={true} />
      <Column field="social_name" header="Nome social" />
      <Column
        field="pronouns"
        header="Pronomes"
        body={(values) => joinArray(values, "pronouns")}
      />
      <Column
        field="gender"
        header="Gênero"
        body={(values) => joinArray(values, "gender")}
      />

      <Column
        field="orientation"
        header="Orientação"
        body={(values) => joinArray(values, "orientation")}
      />

      <Column
        field="phone"
        header="Whatsapp"
        body={(values) => <PhoneButton phone={values.phone} />}
        sortable={false}
      />

      {/* TODO: Make editable */}
      <Column field="process_status" header="Status" />
      <Column field="payment" header="Pagamento" />
      {/* <Column
        field="is_veteran"
        header="Veterane?"
        dataType="boolean"
        body={(values) => booleanBodyTemplate(values, "is_veteran")}
      />
      <Column
        field="is_social_spot"
        header="Vaga Social?"
        dataType="boolean"
        body={(values) => booleanBodyTemplate(values, "is_social_spot")}
      />
      <Column
        field="was_admin_skipped_last_event"
        header="Foi rodízio?"
        dataType="boolean"
        body={(values) =>
          booleanBodyTemplate(values, "was_admin_skipped_last_event")
        }
      /> */}
    </DataTable>
  )
}
