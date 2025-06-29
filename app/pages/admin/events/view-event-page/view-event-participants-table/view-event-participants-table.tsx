import { composable } from "composable-functions"
import { EyeIcon } from "lucide-react"
import {
  Column,
  type ColumnEditorOptions,
  type ColumnEvent,
} from "primereact/column"

import type { FC } from "react"
import type { FetcherWithComponents } from "react-router"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { DataTable } from "~/components/organisms/data-table"
import { PhoneButton } from "~/lib/helpers/phone-to-button"
import { processStatusOptions } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { ComposableFetcherData } from "~types/entities.types"
import { TableInputDropdown } from "./table-input-dropdown"
import { TableInputMoney } from "./table-input-money"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

type AdminViewEventParticipantsTableProps = {
  participants: ProfileWithExtraData[]
  eventId: string
  fetcher: FetcherWithComponents<ComposableFetcherData>
}

const joinArray = (
  values: ProfileWithExtraData,
  prop: keyof ProfileWithExtraData,
) => {
  const value = values[prop]
  return Array.isArray(value) ? value.join(", ") : value
}

const isParticipantAccepted = (participant: ProfileWithExtraData) => {
  return ["sent_payment_data", "paid", "sent_rules"].includes(
    participant.process_status,
  )
}

const statusOptions = processStatusOptions.map((option) => ({
  ...option,
  label: option.name,
}))

export const AdminViewEventParticipantsTable: FC<
  AdminViewEventParticipantsTableProps
> = ({ participants, eventId, fetcher }) => {
  const accepted = participants.filter(isParticipantAccepted)

  const cellEditor = (options: ColumnEditorOptions) => {
    switch (options.field as keyof ProfileWithExtraData) {
      case "payment":
        return <TableInputMoney {...options} />
      case "process_status":
        return <TableInputDropdown {...options} options={statusOptions} />
      default:
        return <div>This Field Lacks an Editing Component</div>
    }
  }

  const onCellEditComplete = async (columnEvent: ColumnEvent) => {
    const { newValue, field, rowData, value } = columnEvent

    rowData[field] = newValue

    const result = await composable(
      async () =>
        await fetcher.submit(
          {
            intent: "update-event-participant",
            id: rowData.id,
            eventId: eventId,
            [field]: newValue,
          },
          { method: "post" },
        ),
    )()

    if (!result.success) {
      rowData[field] = value
      throw new Error("Ops, algo deu errado ao salvar seu valor")
    }
  }

  return (
    <DataTable
      value={participants}
      id="participants"
      sortField="social_name"
      editMode="cell"
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
      <Column field="social_name" header="Nome social" sortable />
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
      <Column
        field="process_status"
        header="Status"
        editor={cellEditor}
        onCellEditComplete={onCellEditComplete}
        body={(values) => (
          <TableInputDropdown
            value={values.process_status}
            options={statusOptions}
          />
        )}
      />
      <Column
        field="payment"
        header="Pagamento"
        editor={cellEditor}
        onCellEditComplete={onCellEditComplete}
        body={(values) => <TableInputMoney value={values.payment} />}
      />
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
