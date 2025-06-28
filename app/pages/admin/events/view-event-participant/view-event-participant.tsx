import { all } from "composable-functions"
import { redirectWithError } from "remix-toast"
import {
  getAdminProfileById,
  getEventParticipantHistoryById,
} from "~/business/admin/admin.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event-participant"
import { BasicData } from "./basic-data"
import { ParticipantEventHistory } from "./participant-event-history"
import { ParticipantVsEventData } from "./participant-vs-event-data"

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

  const getData = all(getAdminProfileById, getEventParticipantHistoryById)

  const result = await getData({ profileId: participantId })

  if (!result.success) {
    throw new Error(
      "Houve um erro procurando o evento ou e participante. Notifique o administrador.",
    )
  }

  const [profile, participantHistory] = result.data

  return {
    profile,
    participantHistory,
  }
}

const ViewEventParticipant = ({ loaderData }: Route.ComponentProps) => {
  const { participantHistory, profile } = loaderData

  const [thisEvent, ...pastEvents] = participantHistory

  const name = profile.social_name || profile.full_name

  return (
    <>
      <div className="flex">
        <div className="space-y-1">
          <h1>{name}</h1>
          <p>
            No evento{" "}
            <b>
              {thisEvent.event_emoji} {thisEvent.event_title}
            </b>
          </p>
        </div>
        <div>{/* TODO: Edit Buttons */}</div>
      </div>

      <BasicData profile={profile} />
      <ParticipantVsEventData eventParticipant={thisEvent} />
      <ParticipantEventHistory
        participantHistory={pastEvents}
        profile={profile}
      />
    </>
  )
}

export default ViewEventParticipant
