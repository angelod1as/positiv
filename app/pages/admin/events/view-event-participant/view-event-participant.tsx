import type { ShouldRevalidateFunctionArgs } from "react-router"
import { NoResultError } from "kysely"
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
import { paymentProvider } from "~/business/payment/payment-provider.server"
import { getPaymentsForParticipant } from "~/business/payment/payment-totals.server"
import {
  isCardPaymentsEnabled,
  isOnlinePaymentsEnabled,
} from "~/business/settings/app-settings.server"
import {
  buildWhatsappPaymentMessage,
  loadWhatsappPaymentMessage,
} from "~/business/payment/payment-messages.server"
import { adminEventsCopy } from "~/copy/admin/events"
import { appOrigin } from "~/lib/helpers/app-origin"
import { logger } from "~/lib/logger/logger.server"
import { assertUuidParams } from "~/lib/helpers/assert-uuid-params"
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
  assertUuidParams(params.eventId, params.profileId)

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
  assertUuidParams(params.eventId, params.profileId)

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
    if (profileResult.errors.every((error) => error instanceof NoResultError)) {
      logger.warn("Profile not found", { profileId })
    } else {
      logger.error("Failed to fetch profile", {
        profileId,
        errors: profileResult.errors,
      })
    }
    return redirectWithError(
      adminEventsCopy.viewParticipant.profileNotFound,
      ADMIN_VIEW_EVENT(eventId),
    )
  }

  const profile = profileResult.data

  if (!eventParticipantResult.success || !eventParticipantResult.data) {
    if (eventParticipantResult.success) {
      logger.warn("Participant has not applied to this event", {
        profileId,
        eventId,
      })
    } else {
      logger.error("Failed to fetch event participant", {
        profileId,
        eventId,
        errors: eventParticipantResult.errors,
      })
    }
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

  const onlinePaymentsEnabled = await isOnlinePaymentsEnabled()
  const [participantPayments, cardPaymentsEnabled, whatsappMessageTemplate] =
    await Promise.all([
      getPaymentsForParticipant(eventParticipant.id),
      isCardPaymentsEnabled(),
      loadWhatsappPaymentMessage(),
    ])

  // The same origin the link email builds from, so the two channels cannot
  // hand the participant different urls for one charge.
  const origin = appOrigin(null)

  const whatsappMessage = buildWhatsappPaymentMessage({
    template: whatsappMessageTemplate,
    active: participantPayments.active,
    participantName: profile.social_name || profile.full_name || "",
    eventTitle: eventParticipant.event_title ?? "",
    appOrigin: origin,
    cardPaymentsEnabled,
  })

  return {
    profile,
    eventParticipant,
    fullHistory,
    eventId,
    participantPayments,
    paymentsEnabled: onlinePaymentsEnabled,
    appOrigin: origin,
    whatsappMessage,
    providerName: paymentProvider().name,
  }
}

const ViewEventParticipant = ({ loaderData }: Route.ComponentProps) => {
  const {
    eventParticipant,
    profile,
    fullHistory,
    eventId,
    participantPayments,
    paymentsEnabled,
    appOrigin: origin,
    whatsappMessage,
    providerName,
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
      paymentsEnabled={paymentsEnabled}
      appOrigin={origin}
      whatsappMessage={whatsappMessage}
      providerName={providerName}
    />
  )
}

export default ViewEventParticipant
