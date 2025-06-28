import { all, inputFromForm } from "composable-functions"
import { formAction } from "remix-forms"
import { redirectWithError, redirectWithSuccess } from "remix-toast"
import {
  getAdminProfileById,
  getEventParticipantHistoryById,
  UpdateParticipantVsEvent,
} from "~/business/admin/admin.server"
import { ParticipantVsEventSchema } from "~/business/admin/common"
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

export async function action({ request }: Route.ActionArgs) {
  const { intent } = await inputFromForm(request)

  if (intent === "participant-vs-event-schema") {
    return formAction({
      request,
      schema: ParticipantVsEventSchema,
      mutation: UpdateParticipantVsEvent,
      transformResult: async (result) => {
        if (result.success) {
          // TODO: FETCHER
          throw await redirectWithSuccess(request.url, "Atualizado com sucesso")
        }
        return result
      },
    })
  }
}

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
