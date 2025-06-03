import { all } from "composable-functions"
import { redirectWithError } from "remix-toast"
import {
  getAdminEventById,
  getAdminProfileById,
  getEventParticipantHistoryById,
} from "~/business/admin/admin.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event-participant"

const {
  admin: {
    events: { ADMIN_EVENTS, ADMIN_EVENT_PARTICIPANTS },
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
      ADMIN_EVENT_PARTICIPANTS(eventId),
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

  return { participant, participantHistory, event }
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
    </>
  )
}

export default ViewEventParticipant
