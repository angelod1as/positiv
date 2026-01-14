import { formAction } from "remix-forms"
import type { ShouldRevalidateFunctionArgs } from "react-router"
import { redirectWithError, redirectWithSuccess } from "remix-toast"
import {
  getEventParticipantBasic,
  getParticipantFullEventHistory,
  getProfileById,
  updateParticipantVsEvent,
  updateProfileAdminNotes,
  updateProfileApprovalStatus,
} from "~/business/admin/admin.server"
import { updateParticipantVsEventSchema } from "~/business/admin/common"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event-participant"
import type { ParticipantEventHistoryData } from "~types/database/entities.types"
import { ParticipantDetail } from "~/components/pages/admin/participants/participant-detail"

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
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "update-profile-approval-status") {
    const result = await updateProfileApprovalStatus(Object.fromEntries(formData))
    return { success: result.success }
  }

  if (intent === "update-profile-admin-notes") {
    const result = await updateProfileAdminNotes(Object.fromEntries(formData))
    return { success: result.success, errors: result.success ? undefined : result.errors }
  }

  if (intent === "participant-vs-event-schema") {
    return formAction({
      request: new Request(request.url, {
        method: "POST",
        body: formData,
      }),
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

  // Run profile and event_participant queries in parallel
  const [profileResult, eventParticipantResult] = await Promise.all([
    getProfileById({ profileId }),
    getEventParticipantBasic({ profileId, eventId }),
  ])

  if (!profileResult.success) {
    console.error("Error fetching profile:", profileResult.errors)
    return redirectWithError(
      "Participante não encontrade.",
      ADMIN_VIEW_EVENT(eventId),
    )
  }

  const profile = profileResult.data

  if (!eventParticipantResult.success || !eventParticipantResult.data) {
    console.error("Error fetching event participant:", eventParticipantResult.errors)
    return redirectWithError(
      "Participante não inscrite neste evento.",
      ADMIN_VIEW_EVENT(eventId),
    )
  }

  const eventParticipant = eventParticipantResult.data

  // Get full participant history
  let fullHistory: ParticipantEventHistoryData[] = []
  const historyResult = await getParticipantFullEventHistory({
    profileId: profile.id,
    excludeEventId: eventId,
  })

  if (historyResult.success) {
    fullHistory = historyResult.data
  }

  return {
    profile,
    eventParticipant,
    fullHistory,
    eventId,
  }
}

const ViewEventParticipant = ({ loaderData }: Route.ComponentProps) => {
  const { eventParticipant, profile, fullHistory, eventId } = loaderData

  if (!profile) return null

  return (
    <ParticipantDetail
      profile={profile}
      fullHistory={fullHistory}
      currentEvent={{
        data: eventParticipant,
        eventId,
      }}
    />
  )
}

export default ViewEventParticipant
