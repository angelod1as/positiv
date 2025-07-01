import { composable } from "composable-functions"
import { EyeIcon } from "lucide-react"
import {
  Column,
  type ColumnEditorOptions,
  type ColumnEvent,
} from "primereact/column"

import { FilterMatchMode } from "primereact/api"
import type { FC } from "react"
import type { FetcherWithComponents } from "react-router"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import {
  GenderWarning,
  OrientationWarning,
  RookieBadge,
  VeteranBadge,
} from "~/components/atoms/badges/badges"
import { DataTable } from "~/components/organisms/data-table"
import { PhoneButton } from "~/lib/helpers/phone-to-button"
import {
  applicationStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  profilePropMap,
} from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type {
  ComposableFetcherData,
  ParticipantApplicationStatus,
} from "~types/entities.types"
import { TableCheckbox } from "./table-checkbox"
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

const isParticipantAccepted = (participant: ProfileWithExtraData) => {
  const arr: ParticipantApplicationStatus[] = [
    "sent_payment_data",
    "sent_rules",
    "finalised",
  ]
  return arr.includes(
    participant.attendance_status as ParticipantApplicationStatus,
  )
}

export const AdminViewEventParticipantsTable: FC<
  AdminViewEventParticipantsTableProps
> = ({ participants, eventId, fetcher }) => {
  const cellEditor = (options: ColumnEditorOptions) => {
    switch (options.field as keyof ProfileWithExtraData) {
      case "payment":
        return <TableInputMoney {...options} />
      case "attendance_status":
        return (
          <TableInputDropdown {...options} options={attendanceStatusOptions} />
        )
      case "application_status":
        return (
          <TableInputDropdown {...options} options={applicationStatusOptions} />
        )
      case "is_social_spot":
        return <TableCheckbox {...options} />
      case "is_staff_spot":
        return <TableCheckbox {...options} />
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

  const { accepted, applications } = participants.reduce(
    (prev, curr) => {
      const { accepted, applications } = prev
      const isAccepted = isParticipantAccepted(curr)
      if (isAccepted) {
        accepted.total = accepted.total + 1
        if (curr.is_veteran) {
          accepted.veterans = accepted.veterans + 1
        } else {
          accepted.rookies = accepted.rookies + 1
        }
      }

      if (curr.is_veteran) {
        applications.veterans = applications.veterans + 1
      } else {
        applications.rookies = applications.rookies + 1
      }

      applications.total = applications.total + 1

      return prev
    },
    {
      applications: {
        total: 0,
        veterans: 0,
        rookies: 0,
      },
      accepted: {
        total: 0,
        veterans: 0,
        rookies: 0,
      },
    },
  )

  return (
    <DataTable
      data={participants}
      id="participants"
      sortField="social_name"
      filters={{
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        application_status: {
          value: null,
          matchMode: FilterMatchMode.EQUALS,
        },
        attendance_status: {
          value: null,
          matchMode: FilterMatchMode.EQUALS,
        },
      }}
      editMode="cell"
      size="small"
      header={{
        title: "Inscrições",
        numbers: (
          <>
            <p>
              <b>{applications.total}</b> inscrites
            </p>
            <p>
              <b>{accepted.total}</b> aceites
            </p>
            <span>|</span>
            <p>Geral:</p>
            <p>
              <b>{applications.rookies}</b> N
            </p>
            <p>
              <b>{applications.veterans}</b> V
            </p>
            <span>|</span>
            <p>Aceites:</p>
            <p>
              <b>{accepted.rookies}</b> N
            </p>
            <p>
              <b>{accepted.veterans}</b> V
            </p>
            <span>|</span>
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
          target: "_blank",
        },
      ]}
    >
      <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />

      <Column
        field="social_name"
        header="Nome"
        sortable
        frozen={true}
        style={{ background: "oklch(87.2% 0.01 258.338)", maxWidth: "200px" }}
        body={(values) =>
          values.social_name || <i>{values.full_name.split(" ")[0]}</i>
        }
      />

      <Column
        field="full_name"
        header={profilePropMap("full_name")}
        className="min-w-40"
      />

      <Column
        field="is_veteran"
        header={profilePropMap("is_veteran")}
        body={(values) =>
          values.is_veteran ? <VeteranBadge /> : <RookieBadge />
        }
        className="min-w-30"
      />

      <Column
        field="pronouns"
        header={profilePropMap("pronouns")}
        body={(values) => values.pronouns.join(", ")}
      />
      <Column
        field="gender"
        className="min-w-40"
        header={profilePropMap("gender")}
        body={(values) => <GenderWarning genders={values.gender} />}
      />

      <Column
        field="orientation"
        header={profilePropMap("orientation")}
        body={(values) => (
          <OrientationWarning orientations={values.orientation} />
        )}
      />

      <Column
        field="phone"
        header={profilePropMap("phone")}
        body={(values) => <PhoneButton phone={values.phone} />}
        sortable={false}
      />

      <Column
        field="application_status"
        header={eventParticipantPropMap("application_status")}
        filter
        filterElement={(options) => (
          <TableInputDropdown
            value={options.value}
            options={applicationStatusOptions}
            filterCallback={options.filterCallback}
            index={options.index}
            placeholder="Selecione"
            className="p-column-filter"
            showClear
          />
        )}
        showFilterMatchModes={false}
        editor={cellEditor}
        onCellEditComplete={onCellEditComplete}
        body={(values) => (
          <TableInputDropdown
            value={values.application_status}
            options={applicationStatusOptions}
          />
        )}
      />

      <Column
        field="attendance_status"
        header={eventParticipantPropMap("attendance_status")}
        filter
        filterElement={(options) => (
          <TableInputDropdown
            value={options.value}
            options={attendanceStatusOptions}
            filterCallback={options.filterCallback}
            index={options.index}
            placeholder="Selecione"
            className="p-column-filter"
            showClear
          />
        )}
        showFilterMatchModes={false}
        editor={cellEditor}
        onCellEditComplete={onCellEditComplete}
        body={(values) => (
          <TableInputDropdown
            value={values.attendance_status}
            options={attendanceStatusOptions}
          />
        )}
      />

      <Column
        field="has_paid"
        header={eventParticipantPropMap("has_paid")}
        dataType="boolean"
        body={(values) => <TableCheckbox value={values.has_paid} disabled />}
      />

      <Column
        field="payment"
        header={eventParticipantPropMap("payment")}
        editor={cellEditor}
        onCellEditComplete={onCellEditComplete}
        body={(values) => <TableInputMoney value={values.payment} />}
      />
      <Column
        field="is_social_spot"
        header={eventParticipantPropMap("is_social_spot")}
        dataType="boolean"
        body={(values) => (
          <TableCheckbox value={values.is_social_spot} disabled />
        )}
      />
      <Column
        field="is_staff_spot"
        header={eventParticipantPropMap("is_staff_spot")}
        dataType="boolean"
        body={(values) => (
          <TableCheckbox value={values.is_staff_spot} disabled />
        )}
        className="min-w-30"
      />
      <Column
        field="was_admin_skipped_last_event"
        header="Foi rodízio na última festa?"
        dataType="boolean"
        className="min-w-40"
        body={(values) => (
          <TableCheckbox disabled value={values.was_admin_skipped_last_event} />
        )}
      />
    </DataTable>
  )
}
