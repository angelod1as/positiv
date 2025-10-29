import { composable } from "composable-functions"
import { EyeIcon } from "lucide-react"
import { Column } from "primereact/column"
import type { FC } from "react"
import type { FetcherWithComponents } from "react-router"
import {
  registerArrayMultiSelectFilters,
  registerMultiSelectFilters,
} from "~/lib/helpers/register-filter-services"
import {
  createFilterTemplates,
  createOnFilterHandler,
  useFilterState,
} from "~/lib/hooks/use-multi-filter-manager"
import { useSessionStorageFilter } from "~/lib/hooks/use-session-storage-filter"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import {
  GenderWarning,
  OrientationWarning,
  RookieBadge,
  VeteranBadge,
} from "~/components/atoms/badges/badges"
import { FlagBadge } from "~/components/atoms/badges/flag-badge"
import {
  CheckboxCellEditor,
  NumberCellEditor,
  SelectCellEditor,
  TextEditModalCell,
  TextViewModalCell,
} from "~/components/forms/admin"
import { DataTable } from "~/components/organisms/tables/base/data-table"
import { PhoneButton } from "~/lib/helpers/phone-to-button"
import {
  applicationStatusOptions,
  approvedToAttendStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  genderFilterOptions,
  orientationFilterOptions,
  PARTICIPANTS_TABLE_FILTER_CONFIGS,
  profilePropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { ComposableFetcherData } from "~types/database/entities.types"
import { countParticipants } from "./count-participants"

const {
  admin: {
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

/**
 * IMPORTANT: If filters appear broken or empty after code changes,
 * try clearing sessionStorage in the browser console:
 * sessionStorage.clear()
 *
 * Stale filter data in sessionStorage can cause issues with new filter configurations.
 */
registerMultiSelectFilters(PARTICIPANTS_TABLE_FILTER_CONFIGS)
registerArrayMultiSelectFilters()

type AdminViewEventParticipantsTableProps = {
  participants: ProfileWithExtraData[]
  eventId: string
  fetcher: FetcherWithComponents<ComposableFetcherData>
}

export const AdminViewEventParticipantsTable: FC<
  AdminViewEventParticipantsTableProps
> = ({ participants, eventId, fetcher }) => {
  const [applicationStatusFilter, setApplicationStatusFilter] =
    useSessionStorageFilter(
      PARTICIPANTS_TABLE_FILTER_CONFIGS.application_status.storageKey,
      [],
    )

  const [attendanceStatusFilter, setAttendanceStatusFilter] =
    useSessionStorageFilter(
      PARTICIPANTS_TABLE_FILTER_CONFIGS.attendance_status.storageKey,
      [],
    )

  const [approvedStatusFilter, setApprovedStatusFilter] =
    useSessionStorageFilter(
      PARTICIPANTS_TABLE_FILTER_CONFIGS.approved_to_attend.storageKey,
      [],
    )

  const [genderFilter, setGenderFilter] = useSessionStorageFilter(
    PARTICIPANTS_TABLE_FILTER_CONFIGS.gender.storageKey,
    [],
  )

  const [orientationFilter, setOrientationFilter] = useSessionStorageFilter(
    PARTICIPANTS_TABLE_FILTER_CONFIGS.orientation.storageKey,
    [],
  )

  const filterSetters = {
    application_status: setApplicationStatusFilter,
    attendance_status: setAttendanceStatusFilter,
    approved_to_attend: setApprovedStatusFilter,
    gender: setGenderFilter,
    orientation: setOrientationFilter,
  }

  const dynamicFilterConfigs = {
    ...PARTICIPANTS_TABLE_FILTER_CONFIGS,
    gender: {
      ...PARTICIPANTS_TABLE_FILTER_CONFIGS.gender,
      options: genderFilterOptions(participants),
    },
    orientation: {
      ...PARTICIPANTS_TABLE_FILTER_CONFIGS.orientation,
      options: orientationFilterOptions(participants),
    },
  }

  const filterTemplates = createFilterTemplates(dynamicFilterConfigs, filterSetters)

  const filters = useFilterState(PARTICIPANTS_TABLE_FILTER_CONFIGS, {
    application_status: applicationStatusFilter,
    attendance_status: attendanceStatusFilter,
    approved_to_attend: approvedStatusFilter,
    gender: genderFilter,
    orientation: orientationFilter,
  })

  const handleFilter = createOnFilterHandler(PARTICIPANTS_TABLE_FILTER_CONFIGS, filterSetters)

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

    const originalValue = participant[field]
    participant[field] = value

    const result = await composable(async () => {
      const formData = new FormData()
      formData.append("intent", "update-event-participant")
      formData.append("id", id)
      formData.append("profile_id", participant.profile_id || "")

      // Always include flag and flag_notes if they exist to satisfy validation
      if (participant.flag && participant.flag !== "none") {
        // Validation requires non-empty flag_notes when flag is set
        if (
          !participant.flag_notes ||
          participant.flag_notes.trim().length === 0
        ) {
          throw new Error(
            "Flag notes são obrigatórias quando uma flag está configurada",
          )
        }
        formData.append("flag", participant.flag)
        formData.append("flag_notes", participant.flag_notes)
      }

      // Add the field being updated
      if (field && value !== undefined && value !== null) {
        // Handle boolean values specially
        if (typeof value === "boolean") {
          formData.append(field, value ? "true" : "false")
        } else {
          formData.append(field, String(value))
        }
      }

      return await fetcher.submit(formData, { method: "post" })
    })()

    if (!result.success) {
      participant[field] = originalValue
      throw new Error("Ops, algo deu errado ao salvar seu valor")
    }
  }

  const { acceptedInProcess, applications } = countParticipants(participants)

  return (
    <DataTable
      data={participants}
      id="participants"
      sortField="social_name"
      sortOrder={1}
      globalFilterFields={["full_name"]}
      filters={filters}
      onFilter={handleFilter}
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
        header="Vet ou Nov?"
        body={(values) =>
          values.is_veteran ? <VeteranBadge /> : <RookieBadge />
        }
        className="min-w-30"
      />

      <Column
        field="flag"
        header={profilePropMap("flag")}
        body={(values) => (
          <FlagBadge flag={values.flag} flagNotes={values.flag_notes} />
        )}
        className="min-w-20"
        sortable
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
        filter
        filterElement={filterTemplates.gender}
        filterField="gender"
        showFilterMatchModes={false}
        body={(values) => <GenderWarning genders={values.gender} />}
      />

      <Column
        field="orientation"
        header={profilePropMap("orientation")}
        filter
        className="min-w-40"
        filterElement={filterTemplates.orientation}
        filterField="orientation"
        showFilterMatchModes={false}
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
        filterElement={filterTemplates.application_status}
        filterField="application_status"
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
        filterElement={filterTemplates.attendance_status}
        filterField="attendance_status"
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
        filterElement={filterTemplates.approved_to_attend}
        filterField="approved_to_attend"
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
        field="companions"
        header={eventParticipantPropMap("companions")}
        className="min-w-[30ch]"
        body={(values) => (
          <TextViewModalCell
            value={values.companions}
            label={eventParticipantPropMap("companions")}
          />
        )}
      />
      <Column
        field="notes"
        header={eventParticipantPropMap("notes")}
        className="min-w-[30ch]"
        body={(values) => (
          <TextEditModalCell
            value={values.notes}
            rowData={values}
            field="notes"
            onSave={handleSave}
            label={eventParticipantPropMap("notes")}
          />
        )}
      />
      <Column
        field="admin_general_notes"
        header={eventParticipantPropMap("admin_general_notes")}
        className="min-w-[30ch]"
        body={(values) => (
          <TextEditModalCell
            value={values.admin_general_notes}
            rowData={values}
            field="admin_general_notes"
            onSave={handleSave}
            label={eventParticipantPropMap("admin_general_notes")}
          />
        )}
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
