import { all } from "composable-functions"
import { redirectWithError } from "remix-toast"
import {
  getAdminEventById,
  getAdminProfileById,
  getEventParticipantHistoryById,
} from "~/business/admin/admin.server"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { formatDateTime } from "~/lib/helpers/format-date-time"
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

const ViewEventParticipant = ({ loaderData }: Route.ComponentProps) => {
  const { participantHistory, participant, event } = loaderData

  const name = participant.social_name || participant.full_name
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
      <div>
        {Object.keys(participant).map((key) => {
          const pKey = key as keyof Database["profiles"]
          const label = profilePropMap(pKey)
          const value = participant[pKey]
          if (value && typeof value === "object" && !Array.isArray(value)) {
            const dateValue = formatDateTime((value as Date).toISOString()).date
            return <DataPair key={key} pair={[label, dateValue]} />
          }

          return <DataPair key={key} pair={[label, value]} />
        })}
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
