import { DataTable } from "components/organisms/data-table"
import { EyeIcon } from "lucide-react"
import { Column } from "primereact/column"
import type { FC } from "react"
import WhatsappIcon from "~/assets/social/whatsapp.svg"
import type { ParticipantWithExtraData } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import { Checkbox } from "~/components/ui/checkbox"
import { phoneToWhatsappLink } from "~/lib/helpers/phone-to-whatsapp-link"
import paths from "~/lib/paths"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

type AdminEventParticipantsTableProps = {
  participants: ParticipantWithExtraData[]
  eventId: string
}

const joinArray = (
  values: ParticipantWithExtraData,
  prop: keyof ParticipantWithExtraData,
) => {
  const value = values[prop]
  return Array.isArray(value) ? value.join(", ") : value
}

const phoneToButton = (
  values: ParticipantWithExtraData,
  prop: keyof ParticipantWithExtraData,
) => {
  const value = values[prop]
  const link = phoneToWhatsappLink(value)
  if (!link) return null
  return (
    <Button to={link} variant="outline" linkProps={{ target: "_blank" }}>
      <img src={WhatsappIcon} alt="Whatsapp" width={20} />
    </Button>
  )
}

const booleanBodyTemplate = (
  values: ParticipantWithExtraData,
  prop: keyof ParticipantWithExtraData,
) => {
  const value = values[prop]
  return <Checkbox checked={Boolean(value)} disabled />
}

export const AdminEventParticipantsTable: FC<
  AdminEventParticipantsTableProps
> = ({ participants, eventId }) => {
  return (
    <DataTable
      value={participants}
      id="participants"
      sortField="time_event_start"
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
        body={(values) => phoneToButton(values, "phone")}
        sortable={false}
      />

      {/* TODO: Make editable */}
      <Column field="process_status" header="Status" />
      <Column field="payment" header="Pagamento" />
      <Column
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
      />
    </DataTable>
  )
}
