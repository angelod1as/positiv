import { inputFromForm } from "composable-functions"
import { formAction } from "remix-forms"
import type { ShouldRevalidateFunctionArgs } from "react-router"
import { redirectWithError, redirectWithSuccess } from "remix-toast"
import {
  getEventParticipantHistoryById,
  getProfileWithExtraDataById,
  getParticipantFullEventHistory,
  updateParticipantVsEvent,
} from "~/business/admin/admin.server"
import { updateParticipantVsEventSchema } from "~/business/admin/common"
import { getAge } from "~/lib/helpers/get-age"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event-participant"
import type { ParticipantVsEvent } from "~types/database/entities.types"
import { BasicData } from "~/components/pages/admin/participants/basic-data"
import { ParticipantVsEventData } from "~/components/pages/admin/participants/participant-vs-event-data"
import { ParticipantEventHistoryAG } from "~/components/pages/admin/participants/participant-event-history-ag"

const {
  admin: {
    events: { ADMIN_EVENTS, ADMIN_VIEW_EVENT },
  },
} = paths

export function shouldRevalidate({
  currentParams,
  nextParams,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
  const hasParamsChanged =
    currentParams.eventId !== nextParams.eventId ||
    currentParams.profileId !== nextParams.profileId

  return hasParamsChanged || defaultShouldRevalidate
}

export async function action({ request }: Route.ActionArgs) {
  const { intent } = await inputFromForm(request)

  if (intent === "participant-vs-event-schema") {
    return formAction({
      request,
      schema: updateParticipantVsEventSchema,
      mutation: updateParticipantVsEvent,
      transformResult: async (result) => {
        if (result.success) {
          throw await redirectWithSuccess(request.url, "Atualizado com sucesso")
        }
        return result
      },
    })
  }
}

export async function loader({ params }: Route.LoaderArgs) {
  const { eventId, profileId } = params

  if (!eventId) {
    return redirectWithError("Evento não encontrado", ADMIN_EVENTS)
  }
  if (!profileId) {
    return redirectWithError(
      "Participante não encontrade",
      ADMIN_VIEW_EVENT(eventId),
    )
  }

  const profileResult = await getProfileWithExtraDataById({
    profileId: profileId,
    eventId: eventId,
  })

  if (!profileResult.success) {
    console.error("Error fetching profile:", profileResult.errors)
    return redirectWithError(
      "Participante não encontrade ou não inscrite neste evento.",
      ADMIN_VIEW_EVENT(eventId),
    )
  }

  const profile = profileResult.data

  // Get current event data
  const currentEventResult = await getEventParticipantHistoryById({
    profileId: profileId,
    eventId: eventId,
  })

  if (!currentEventResult.success) {
    console.error("Error fetching event history:", currentEventResult.errors)
    return redirectWithError(
      "Erro ao carregar histórico do evento.",
      ADMIN_VIEW_EVENT(eventId),
    )
  }

  // Get full participant history for all participants (not just veterans)
  let fullHistory: Array<ParticipantVsEvent & { time_event_start: string }> = []
  if (profile?.profile_id) {
    const historyResult = await getParticipantFullEventHistory({
      profileId: profile.profile_id,
      excludeEventId: eventId,
    })

    if (historyResult.success) {
      fullHistory = historyResult.data
    }
  }

  return {
    profile,
    participantHistory: currentEventResult.data,
    fullHistory,
  }
}

const ViewEventParticipant = ({ loaderData }: Route.ComponentProps) => {
  const { participantHistory, profile, fullHistory } = loaderData

  if (!profile) return null

  const [thisEvent] = participantHistory

  const name = profile.social_name || profile.full_name

  return (
    <>
      <div className="flex">
        <div className="space-y-1">
          <h1>
            {name}, {getAge(profile.date_of_birth)}
          </h1>
          <p>
            No evento{" "}
            <b>
              {thisEvent.event_emoji} {thisEvent.event_title}
            </b>
          </p>
        </div>
      </div>

      <BasicData profile={profile} />
      <ParticipantVsEventData eventParticipant={thisEvent} />
      {fullHistory.length > 0 && (
        <ParticipantEventHistoryAG participantHistory={fullHistory} />
      )}
    </>
  )
}

export default ViewEventParticipant
