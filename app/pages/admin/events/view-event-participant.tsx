import { all } from "composable-functions"
import { redirectWithError } from "remix-toast"
import {
  getAdminEventById,
  getAdminProfileById,
  getEventParticipantHistoryById,
} from "~/business/admin/admin.server"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { phoneToButton } from "~/lib/helpers/phone-to-button"
import { eventParticipantPropMap, profilePropMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { Database } from "~types/kysely.types"
import type { Route } from "./+types/view-event-participant"

const {
  admin: {
    events: { ADMIN_EVENTS, ADMIN_VIEW_EVENT },
  },
} = paths

export async function loader({ params }: Route.LoaderArgs) {
  const { eventId, participantId } = params

  if (!eventId) {
    return redirectWithError("Evento não encontrado", ADMIN_EVENTS)
  }
  if (!participantId) {
    return redirectWithError(
      "Participante não encontrade",
      ADMIN_VIEW_EVENT(eventId),
    )
  }

  const getData = all(
    getAdminProfileById,
    getEventParticipantHistoryById,
    getAdminEventById,
  )

  const result = await getData({ profileId: participantId, eventId })

  if (!result.success) {
    throw new Error(
      "Houve um erro procurando o evento ou e participante. Notifique o administrador.",
    )
  }

  const [participant, participantHistory, event] = result.data

  return {
    participant,
    participantHistory,
    event,
  }
}

const getAge = (date_of_birth: string | null) => {
  if (!date_of_birth) return ""
  const date = new Date(date_of_birth)
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()

  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
    age--
  }

  return age
}

const ViewEventParticipant = ({ loaderData }: Route.ComponentProps) => {
  const { participantHistory, participant, event } = loaderData

  const name = participant.social_name || participant.full_name

  const {
    full_name,
    allow_marketing_email,
    basic_data_filled,
    cpf,
    created_at,
    date_of_birth,
    email,
    gender,
    how_came_to_us,
    id,
    is_veteran,
    orientation,
    phone,
    pronouns,
    rg,
    rg_issuer,
    social_name,
    user_id,
    where_lives,
  } = participant

  const dataPairs: Array<Array<string | null | undefined>> = [
    [profilePropMap("rg"), rg],
    [profilePropMap("rg_issuer"), rg_issuer],
    [profilePropMap("cpf"), cpf],
    // TODO: AGE
    [profilePropMap("date_of_birth"), date_of_birth],
    [profilePropMap("where_lives"), where_lives],
    [profilePropMap("how_came_to_us"), how_came_to_us],
  ]

  // TODO: Phone to Whatsapp
  return (
    <>
      <div className="flex">
        <div>
          <h1>{name}</h1>
          <p>
            No evento {event.emoji} {event.title}
          </p>
        </div>
        <div>{/* TODO: Edit Buttons */}</div>
      </div>
      <h2>Dados básicos</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <h3>
            <b>{social_name}</b> ({full_name}), {getAge(date_of_birth)}
          </h3>
          <p>{is_veteran ? "Veterane" : "Novate"}</p>
          <p>
            {gender?.join(", ")}; {pronouns?.join(", ")};{" "}
            {orientation?.join(", ")}{" "}
          </p>
          <div>{phoneToButton(phone)}</div>
        </div>
        <div className="flex flex-col gap-2">
          <DataPair top pair={[profilePropMap("email"), email]} />
          <DataPair top pair={[profilePropMap("rg"), `${rg} ${rg_issuer}`]} />
          <DataPair top pair={[profilePropMap("cpf"), cpf]} />
          <DataPair top pair={[profilePropMap("where_lives"), where_lives]} />
          <DataPair
            top
            pair={[profilePropMap("how_came_to_us"), how_came_to_us]}
          />
        </div>
      </div>

      <h2>Neste evento</h2>
      {event.id}
      <div />
      <h2>Histórico anterior</h2>
      <div className="flex flex-col gap-4">
        {participantHistory.map(
          ({ event_emoji, event_title, ...pastEvent }) => {
            return (
              <div key={pastEvent.id}>
                <h3>
                  {event_emoji} {event_title}
                </h3>
                {Object.keys(pastEvent).map((key) => {
                  const pKey = key as keyof Database["event_participants"]
                  const label = eventParticipantPropMap(pKey)
                  const value = pastEvent[pKey]
                  const dateValue =
                    typeof value === "object"
                      ? formatDateTime(
                          (
                            participant.date_of_birth as unknown as Date
                          ).toISOString(),
                        ).date
                      : undefined
                  return (
                    <DataPair key={key} pair={[label, dateValue || value]} />
                  )
                })}
              </div>
            )
          },
        )}
      </div>
    </>
  )
}

export default ViewEventParticipant
