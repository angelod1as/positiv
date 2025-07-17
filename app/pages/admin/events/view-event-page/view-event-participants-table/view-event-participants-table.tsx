import { composable } from "composable-functions"
import { EyeIcon } from "lucide-react"
import { FilterMatchMode } from "primereact/api"
import { Column } from "primereact/column"
import type { FC } from "react"
import type { FetcherWithComponents } from "react-router"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import {
  GenderWarning,
  OrientationWarning,
  RookieBadge,
  VeteranBadge,
} from "~/components/atoms/badges/badges"
import {
  CheckboxCellEditor,
  NumberCellEditor,
  SelectCellEditor,
} from "~/components/forms/admin"
import { DataTable } from "~/components/organisms/data-table"
import { PhoneButton } from "~/lib/helpers/phone-to-button"
import {
  applicationStatusOptions,
  approvedToAttendStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  profilePropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { ComposableFetcherData } from "~types/entities.types"
import { countParticipants } from "./count-participants"
import { TableInputDropdown } from "./table-input-dropdown"

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

export const AdminViewEventParticipantsTable: FC<
  AdminViewEventParticipantsTableProps
> = ({ participants, eventId, fetcher }) => {
  /**
   * Generic function to save changes to a participant field
   */
  const handleSave = async <K extends keyof ProfileWithExtraData>(
    id: string,
    field: K,
    value: ProfileWithExtraData[K],
  ) => {
    const participant = participants.find((p) => p.id === id)
    if (!participant) return

    participant[field] = value

    const result = await composable(async () => {
      const obj = field ? { [field]: value } : {}
      return await fetcher.submit(
        {
          intent: "update-event-participant",
          id,
          eventId,
          profile_id: participant.profile_id,
          ...obj,
        },
        { method: "post" },
      )
    })()

    if (!result.success) {
      throw new Error("Ops, algo deu errado ao salvar seu valor")
    }
  }

  const { acceptedInProcess, applications } = countParticipants(participants)

  return (
    <DataTable
      data={participants}
      id="participants"
      sortField="social_name"
      globalFilterFields={["full_name"]}
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
      size="small"
      header={{
        title: "Inscrições",
        elements: (
          <>
            <p>
              <b>{applications.total}</b> inscrites
            </p>
            <p>
              <b>{acceptedInProcess.total}</b> aceites no processo
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
            <p>Aceites no processo:</p>
            <p>
              <b>{acceptedInProcess.rookies}</b> N
            </p>
            <p>
              <b>{acceptedInProcess.veterans}</b> V
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
        },
      ]}
    >
      <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />

      <Column
        field="social_name"
        header="Nome"
        sortable
        frozen={true}
        style={{
          background: "oklch(87.2% 0.01 258.338)",
          maxWidth: "200px",
          zIndex: 100,
        }}
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
        className="min-w-[180px]"
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
        body={(values) => (
          <SelectCellEditor
            value={values.application_status}
            rowData={values}
            field="application_status"
            onSave={handleSave}
            options={applicationStatusOptions.map((opt) => ({
              label: opt.name,
              value: opt.value,
            }))}
          />
        )}
      />

      <Column
        field="attendance_status"
        header={eventParticipantPropMap("attendance_status")}
        filter
        className="min-w-[180px]"
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
        body={(values) => (
          <SelectCellEditor
            value={values.attendance_status}
            rowData={values}
            field="attendance_status"
            onSave={handleSave}
            options={attendanceStatusOptions.map((opt) => ({
              label: opt.name,
              value: opt.value,
            }))}
          />
        )}
      />

      <Column
        field="approved_to_attend"
        header={profilePropMap("approved_to_attend")}
        filter
        className="min-w-[180px]"
        filterElement={(options) => (
          <TableInputDropdown
            value={options.value}
            options={approvedToAttendStatusOptions}
            filterCallback={options.filterCallback}
            index={options.index}
            placeholder="Selecione"
            className="p-column-filter"
            showClear
          />
        )}
        showFilterMatchModes={false}
        body={(values) => (
          <SelectCellEditor
            value={values.approved_to_attend}
            rowData={values}
            field="approved_to_attend"
            onSave={handleSave}
            options={approvedToAttendStatusOptions.map((opt) => ({
              label: opt.name,
              value: opt.value,
            }))}
          />
        )}
      />

      <Column
        field="has_paid"
        header={eventParticipantPropMap("has_paid")}
        dataType="boolean"
        body={(values) => (
          <CheckboxCellEditor
            value={values.has_paid}
            rowData={values}
            field="has_paid"
            onSave={handleSave}
          />
        )}
      />

      <Column
        field="payment"
        header={eventParticipantPropMap("payment")}
        body={(values) => (
          <NumberCellEditor
            value={values.payment}
            rowData={values}
            field="payment"
            onSave={handleSave}
          />
        )}
      />
      <Column
        field="spot_type"
        header={eventParticipantPropMap("spot_type")}
        className="min-w-[130px]"
        body={(values) => (
          <SelectCellEditor
            value={values.spot_type}
            rowData={values}
            field="spot_type"
            onSave={handleSave}
            options={spotTypeOptions.map((opt) => ({
              label: opt.name,
              value: opt.value,
            }))}
          />
        )}
      />
      <Column
        field="is_veteran"
        header={profilePropMap("is_veteran")}
        dataType="boolean"
        body={(values) => (
          <CheckboxCellEditor
            value={values.is_veteran}
            rowData={values}
            field="is_veteran"
            onSave={handleSave}
          />
        )}
        className="min-w-30"
      />
      <Column
        field="was_admin_skipped_last_event"
        header="Foi rodízio na última festa?"
        dataType="boolean"
        className="min-w-40"
        body={({ was_admin_skipped_last_event }) =>
          was_admin_skipped_last_event ? "Sim" : ""
        }
      />
    </DataTable>
  )
}
