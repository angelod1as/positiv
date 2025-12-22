import { EyeIcon, FlagIcon } from "lucide-react"
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
import { FlagBadge } from "~/components/atoms/badges/flag-badge"
import { Link } from "~/components/atoms/link/link"
import {
  CheckboxCellEditor,
  NumberCellEditor,
  SelectCellEditor,
  TextEditModalCell,
  TextViewModalCell,
} from "~/components/forms/admin"
import { DataTable } from "~/components/organisms/tables/base/data-table"
import { FLAG_COLORS } from "~/lib/constants/flag-constants"
import { createColumnHeader } from "~/lib/helpers/create-column-header"
import { createSaveHandler } from "~/lib/helpers/create-save-handler"
import { formatDateTime } from "~/lib/helpers/format-date-time"
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
import {
  registerArrayMultiSelectFilters,
  registerMultiSelectFilters,
} from "~/lib/helpers/register-filter-services"
import { useSessionStorageFilter } from "~/lib/hooks/use-session-storage-filter"
import { useSmartPrefetch } from "~/lib/hooks/use-smart-prefetch"
import { useTableFilters } from "~/lib/hooks/use-table-filters"
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
        application_status: [
          applicationStatusFilter,
          setApplicationStatusFilter,
        ],
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
        header={createColumnHeader("Nome")}
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
        header={createColumnHeader(profilePropMap("full_name"))}
        className="min-w-40"
      />

      <Column
        field="is_veteran"
        header={createColumnHeader("Vet ou Nov?", {
          tooltip: (
            <>
              <p>
                <b>
                  O número ao lado da badge 'Veterane' indica quantos eventos
                  finalizados a pessoa já participou.
                </b>
              </p>
              <br />
              <p>
                <b>Importante:</b> Essa conta é feita a partir de quando o
                sistema foi criado, em agosto de 2025.
              </p>
            </>
          ),
        })}
        filter
        filterElement={filterTemplates.is_veteran}
        filterField="is_veteran"
        showFilterMatchModes={false}
        body={(values) =>
          values.is_veteran ? (
            <VeteranBadge eventCount={values.attended_events_count} />
          ) : (
            <RookieBadge />
          )
        }
        className="min-w-30"
      />

      <Column
        field="last_attended_event"
        header={createColumnHeader("Último Evento", {
          tooltip:
            "Trata-se do último evento que a pessoa se inscreveu e participou.",
        })}
        body={(values) => {
          if (
            !values.last_attended_event_title ||
            !values.last_attended_event_date
          ) {
            return "-"
          }

          const formattedDate = formatDateTime(
            values.last_attended_event_date,
            "numeric",
          ).date
          if (!formattedDate) return "-"

          const maxTitleLength = 20
          const truncatedTitle =
            values.last_attended_event_title.length > maxTitleLength
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
        header={createColumnHeader(profilePropMap("flag"), {
          tooltip: (
            <>
              <p>
                <b>
                  Adicionamos flags às pessoas que representam algum tipo de
                  ameaça ao ecossistema.
                </b>
              </p>
              <br />
              <p>
                <b>
                  Flag Vermelha{" "}
                  <FlagIcon
                    className={`size-4 ${FLAG_COLORS.red} inline-block`}
                  />
                </b>{" "}
                — a pessoa fez algo MUITO relevante e impactante - assédio,
                abuso, violências físicas ou verbais... Não vai mais na festa.
              </p>
              <p>
                <b>
                  Flag Amarela{" "}
                  <FlagIcon
                    className={`size-4 ${FLAG_COLORS.yellow} inline-block`}
                  />
                </b>{" "}
                — a pessoa precisa de algum tipo de monitoramento por
                comportamentos complicados - pode ter sido uma crise numa festa,
                pessoas que não chegaram a assediar, mas que apresentam um
                comportamento meio invasivo. Pode ir à festa, dependendo do
                contexto.
              </p>
              <p>
                <b>
                  Flag cinza{" "}
                  <FlagIcon
                    className={`size-4 ${FLAG_COLORS.gray} inline-block`}
                  />
                </b>{" "}
                — representa uma pessoa que já teve uma flag vermelha ou
                amarela, mas que, numa segunda chance, mudou o comportamento.
              </p>
            </>
          ),
        })}
        body={(values) => (
          <FlagBadge flag={values.flag} flagNotes={values.flag_notes} />
        )}
        className="min-w-20"
        sortable
      />

      <Column
        field="pronouns"
        header={createColumnHeader(profilePropMap("pronouns"))}
        body={(values) => values.pronouns?.join(", ") || "-"}
      />
      <Column
        field="gender"
        className="min-w-40"
        header={createColumnHeader(profilePropMap("gender"))}
        filter
        filterElement={filterTemplates.gender}
        filterField="gender"
        showFilterMatchModes={false}
        body={(values) => <GenderWarning genders={values.gender} />}
      />

      <Column
        field="orientation"
        header={createColumnHeader(profilePropMap("orientation"))}
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
        header={createColumnHeader(profilePropMap("phone"))}
        body={(values) => <PhoneButton phone={values.phone} />}
        sortable={false}
      />

      <Column
        field="application_status"
        header={createColumnHeader(
          eventParticipantPropMap("application_status"),
          {
            tooltip: (
              <>
                <p>
                  <b>Representa o status do processo de seleção da pessoa.</b>
                </p>
                <br />
                <p>
                  <b>Conversando</b> — está fazendo a entrevista pelo whatsapp -
                  se aplica apenas a novates.
                </p>
                <p>
                  <b>Dados de pagto enviados</b> — se aplica a novates e
                  veteranes. Significa que a pessoa já foi aceita para
                  participar nessa festa e que contamos com seu pagto.
                </p>
                <p>
                  <b>Regras enviadas</b> — se aplica a novates e veteranes.
                  Significa que a pessoa já pagou e enviou o comprovante.
                  Enviamos as regras A TODES, não importa quantas vezes as
                  pessoas já foram.
                </p>
                <p>
                  <b>Pensar melhor</b> — É um status para novates e veteranes e
                  significa pessoas que ainda estamos em dúvida se serão aceitas
                  para a festa específica.
                </p>
                <p>
                  <b>Finalizado</b> — se aplica a novates e veteranes e é usado
                  quando o processo de seleção está finalizado, seja pq a pessoa
                  disse que não poderá participar, porque já pagou e leu as
                  regras, ou porque é uma pessoa que não aprovamos.
                </p>
              </>
            ),
          },
        )}
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
        header={createColumnHeader(
          eventParticipantPropMap("attendance_status"),
          {
            tooltip: (
              <>
                <p>
                  <b>Representa a presença da pessoa na festa.</b>
                </p>
                <br />
                <p>
                  <b>Pendente</b> — a festa ainda não ocorreu e o processo de
                  seleção está acontecendo.
                </p>
                <p>
                  <b>Não compareceu</b> — a festa já aconteceu e a pessoa, que
                  estava confirmada, não foi.
                </p>
                <p>
                  <b>Pulade (rodízio)</b> — aplicado quando a pessoa caiu no
                  rodízio.
                </p>
                <p>
                  <b>Não vai</b> — aplicado para pessoas não aceitas no
                  processo, ou que já disseram que não poderão ir.
                </p>
              </>
            ),
          },
        )}
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
        header={createColumnHeader(profilePropMap("approved_to_attend"), {
          tooltip: (
            <>
              <p>
                <b>
                  Representa o status da pessoa na POSITIV e não na festa
                  específica.
                </b>
              </p>
              <br />
              <p>
                <b>Pendente</b> — a pessoa ainda não passou por entrevista.
              </p>
              <p>
                <b>Aprovade</b> — a pessoa passou por entrevista e foi aprovada.
              </p>
              <p>
                <b>Aprovade com ressalvas</b> — a pessoa apresenta algum tipo de
                problema, que não será aceita em todas as festas.
              </p>
              <p>
                <b>Rejeitade</b> — a pessoa passou por entrevista e foi
                REJEITADA para participar de qualquer festa.
              </p>
            </>
          ),
        })}
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
        header={createColumnHeader(eventParticipantPropMap("has_paid"))}
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
        header={createColumnHeader(eventParticipantPropMap("payment"))}
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
        header={createColumnHeader(eventParticipantPropMap("spot_type"), {
          tooltip: (
            <>
              <p>
                <b>Regular</b> — vaga para pessoas que pagam integralmente o
                valor.
              </p>
              <p>
                <b>Staff</b> — vagas para pessoas que trabalham conosco, ou têm
                algum tipo de permuta.
              </p>
              <p>
                <b>Social</b> — vaga para pessoas que pagam porcentagens
                diferentes de 100% do valor.
              </p>
            </>
          ),
        })}
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
        header={createColumnHeader(profilePropMap("is_veteran"))}
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
        header={createColumnHeader(eventParticipantPropMap("companions"))}
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
        header={createColumnHeader(eventParticipantPropMap("notes"))}
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
        header={createColumnHeader(
          eventParticipantPropMap("admin_general_notes"),
        )}
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
        header={createColumnHeader("Foi rodízio na última festa?")}
        dataType="boolean"
        className="min-w-40"
        body={({ was_admin_skipped_last_event }) =>
          was_admin_skipped_last_event ? "Sim" : ""
        }
      />
    </DataTable>
  )
}
