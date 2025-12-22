import { EyeIcon, Info } from "lucide-react"
import { Column } from "primereact/column"
import type { FC } from "react"
import type { FetcherWithComponents } from "react-router"
import { Link } from "~/components/atoms/link/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import {
  registerArrayMultiSelectFilters,
  registerMultiSelectFilters,
} from "~/lib/helpers/register-filter-services"
import { createSaveHandler } from "~/lib/helpers/create-save-handler"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { useSessionStorageFilter } from "~/lib/hooks/use-session-storage-filter"
import { useSmartPrefetch } from "~/lib/hooks/use-smart-prefetch"
import { useTableFilters } from "~/lib/hooks/use-table-filters"
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
import { ParticipantsTableSkeleton } from "./participants-table-skeleton"

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
  const prefetchStrategy = useSmartPrefetch()

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

  const [isVeteranFilter, setIsVeteranFilter] = useSessionStorageFilter(
    PARTICIPANTS_TABLE_FILTER_CONFIGS.is_veteran.storageKey,
    [],
  )

  const { filters, filterTemplates, handleFilter, handleClearFilters } =
    useTableFilters(
      PARTICIPANTS_TABLE_FILTER_CONFIGS,
      {
        application_status: [applicationStatusFilter, setApplicationStatusFilter],
        attendance_status: [attendanceStatusFilter, setAttendanceStatusFilter],
        approved_to_attend: [approvedStatusFilter, setApprovedStatusFilter],
        gender: [genderFilter, setGenderFilter],
        orientation: [orientationFilter, setOrientationFilter],
        is_veteran: [isVeteranFilter, setIsVeteranFilter],
      },
      participants,
      {
        gender: genderFilterOptions,
        orientation: orientationFilterOptions,
      },
    )

  const handleSave = createSaveHandler({
    data: participants,
    fetcher,
    intent: "update-event-participant",
    getRequiredFields: (participant) => ({
      profile_id: participant.profile_id || "",
      ...(participant.flag && participant.flag !== "none"
        ? {
            flag: participant.flag,
            flag_notes: participant.flag_notes || "",
          }
        : {}),
    }),
  })

  const { acceptedInProcess, applications } = countParticipants(participants)

  return (
    <DataTable
      data={participants}
      id="participants"
      sortField="social_name"
      sortOrder={1}
      globalFilterFields={["full_name", "social_name"]}
      filters={filters}
      onFilter={handleFilter}
      onClearFilters={handleClearFilters}
      size="small"
      loadingComponent={<ParticipantsTableSkeleton />}
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
          key: "profile_id",
          prefetch: prefetchStrategy,
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
        header={
          <div className="flex items-center gap-1">
            <span>Vet ou Nov?</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-gray-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    O número ao lado da badge Veterane indica quantos eventos finalizados a pessoa já participou (excluindo o evento atual e eventos cancelados).
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        filter
        filterElement={filterTemplates.is_veteran}
        filterField="is_veteran"
        showFilterMatchModes={false}
        body={(values) =>
          values.is_veteran
            ? <VeteranBadge eventCount={values.attended_events_count} />
            : <RookieBadge />
        }
        className="min-w-30"
      />

      <Column
        field="last_attended_event"
        header="Último Evento"
        body={(values) => {
          if (!values.last_attended_event_title || !values.last_attended_event_date) {
            return "-"
          }

          const formattedDate = formatDateTime(values.last_attended_event_date, "numeric").date
          if (!formattedDate) return "-"

          const maxTitleLength = 20
          const truncatedTitle = values.last_attended_event_title.length > maxTitleLength
            ? `${values.last_attended_event_title.substring(0, maxTitleLength)}…`
            : values.last_attended_event_title

          if (values.last_attended_event_id && values.profile_id) {
            return (
              <div>
                <div className="text-sm text-gray-500">{formattedDate}</div>
                <Link
                  to={ADMIN_EVENT_VIEW_PARTICIPANT(
                    values.last_attended_event_id,
                    values.profile_id,
                  )}
                >
                  {truncatedTitle}
                </Link>
              </div>
            )
          }

          return `${formattedDate} - ${truncatedTitle}`
        }}
        className="min-w-40"
        sortable
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
        body={(values) => values.pronouns?.join(", ") || "-"}
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
