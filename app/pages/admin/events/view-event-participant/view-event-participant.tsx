import type { ShouldRevalidateFunctionArgs } from "react-router"
import { redirectWithError } from "remix-toast"
import {
  getAdminContext,
  getEventParticipantBasic,
  getParticipantFullEventHistory,
  getProfileById,
  updateEventParticipantById,
  updateProfileAdminNotes,
  updateProfileApprovalStatus,
} from "~/business/admin/admin.server"
import { handlePaymentIntent } from "~/business/payment/payment-intents.server"
import { getPaymentsForParticipant } from "~/business/payment/payment-totals.server"
import { adminEventsCopy } from "~/copy/admin/events"
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

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)

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

  if (intent === "update-event-participant") {
    const result = await updateEventParticipantById(Object.fromEntries(formData))
    return { success: result.success, errors: result.success ? undefined : result.errors }
  }

  const paymentResult = await handlePaymentIntent(
    String(intent),
    formData,
    context.currentProfile?.id,
  )
  if (paymentResult) return paymentResult
}

export async function loader({ params }: Route.LoaderArgs) {
  const { eventId, profileId } = params

  if (!eventId) {
    return redirectWithError(adminEventsCopy.eventNotFound, ADMIN_EVENTS)
  }
  if (!profileId) {
    return redirectWithError(
      adminEventsCopy.viewParticipant.participantNotFound,
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
      adminEventsCopy.viewParticipant.profileNotFound,
      ADMIN_VIEW_EVENT(eventId),
    )
  }

  const profile = profileResult.data

  if (!eventParticipantResult.success || !eventParticipantResult.data) {
    console.error("Error fetching event participant:", eventParticipantResult.errors)
    return redirectWithError(
      adminEventsCopy.viewParticipant.notAppliedToEvent,
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

  const participantPayments = await getPaymentsForParticipant(
    eventParticipant.id,
  )

  return {
    profile,
    eventParticipant,
    fullHistory,
    eventId,
    participantPayments,
  }
}

const ViewEventParticipant = ({ loaderData }: Route.ComponentProps) => {
  const {
    eventParticipant,
    profile,
    fullHistory,
    eventId,
    participantPayments,
  } = loaderData

  if (!profile) return null

  return (
    <ParticipantDetail
      profile={profile}
      fullHistory={fullHistory}
      currentEvent={{
        data: eventParticipant,
        eventId,
      }}
      payments={participantPayments}
    />
  )
}

export default ViewEventParticipant
