import type { ShouldRevalidateFunctionArgs } from "react-router"
import { isNoResultError } from "~/lib/helpers/kysely-helpers.server"
import { redirectWithError } from "remix-toast"
import { getAdminContext } from "~/business/auth/admin-context.server"
import {
  getParticipantFullEventHistory,
  getProfileById,
  updateProfileAdminNotes,
  updateProfileApprovalStatus,
} from "~/business/profile/profiles.server"
import { getEventParticipantBasic, updateEventParticipantById } from "~/business/application/event-participants.server"
import { setProfileCpfExempt } from "~/business/profile/cpf-exemption.server"
import { getParticipantLikert } from "~/business/profile/participant-likert.server"
import { handlePaymentIntent } from "~/business/payment/payment-intents.server"
import {
  canSeePayments,
  paymentsVisibleTo,
} from "~/business/payment/payment-visibility"
import { paymentProvider } from "~/business/payment/payment-provider.server"
import { getPaymentsForParticipant } from "~/business/payment/payment-totals.server"
import { isCardPaymentsEnabled } from "~/business/settings/app-settings.server"
import { isOnlinePaymentsEnabled } from "~/business/payment/online-payments.server"
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
import { readFormData } from "~/lib/request/read-form-data.server"

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

  const formData = await readFormData(request)
  const intent = formData.get("intent")

  if (intent === "update-profile-approval-status") {
    const result = await updateProfileApprovalStatus(Object.fromEntries(formData))
    return { success: result.success }
  }

  if (intent === "update-profile-cpf-exempt") {
    // The profile of the page, not one the form names: the admin decided on
    // the person in front of them.
    const result = await setProfileCpfExempt({
      profileId: params.profileId,
      cpfExempt: formData.get("cpfExempt"),
    })
    // Copied out: React Router turns every Error in action data into
    // "Unexpected Server Error" in a production build.
    return result.success
      ? { success: true }
      : {
          success: false,
          errors: result.errors.map((error) => ({ message: error.message })),
        }
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
    context.currentProfile,
  )
  if (paymentResult) return paymentResult
}

export async function loader({ request, params }: Route.LoaderArgs) {
  assertUuidParams(params.eventId, params.profileId)

  const { currentProfile } = await getAdminContext(request, params)
  const canManagePayments = canSeePayments(currentProfile)

  const { eventId, profileId } = params

  if (!eventId) {
    return redirectWithError(ADMIN_EVENTS, adminEventsCopy.eventNotFound)
  }
  if (!profileId) {
    return redirectWithError(
      ADMIN_VIEW_EVENT(eventId),
      adminEventsCopy.viewParticipant.participantNotFound,
    )
  }

  // Run profile and event_participant queries in parallel
  const [profileResult, eventParticipantResult, likert] = await Promise.all([
    getProfileById({ profileId }),
    getEventParticipantBasic({ profileId, eventId }),
    getParticipantLikert({ profileId, viewer: currentProfile }),
  ])

  if (!profileResult.success) {
    if (profileResult.errors.every(isNoResultError)) {
      logger.warn("Profile not found", { profileId })
    } else {
      logger.error("Failed to fetch profile", {
        profileId,
        errors: profileResult.errors,
      })
    }
    return redirectWithError(
      ADMIN_VIEW_EVENT(eventId),
      adminEventsCopy.viewParticipant.profileNotFound,
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
      ADMIN_VIEW_EVENT(eventId),
      adminEventsCopy.viewParticipant.notAppliedToEvent,
    )
  }

  const [eventParticipant] = paymentsVisibleTo(currentProfile, [
    eventParticipantResult.data,
  ])

  // Get full participant history
  let fullHistory: ParticipantEventHistoryData[] = []
  const historyResult = await getParticipantFullEventHistory({
    profileId: profile.id,
    excludeEventId: eventId,
  })

  if (historyResult.success) {
    fullHistory = paymentsVisibleTo(currentProfile, historyResult.data)
  }

  // The same origin the link email builds from, so the two channels cannot
  // hand the participant different urls for one charge.
  const origin = appOrigin(null)

  const [
    onlinePaymentsEnabled,
    participantPayments,
    cardPaymentsEnabled,
    whatsappMessageTemplate,
  ] = canManagePayments
    ? await Promise.all([
        isOnlinePaymentsEnabled(),
        getPaymentsForParticipant(eventParticipant.id),
        isCardPaymentsEnabled(),
        loadWhatsappPaymentMessage(),
      ])
    : [false, undefined, false, null]

  const whatsappMessage = participantPayments
    ? buildWhatsappPaymentMessage({
        template: whatsappMessageTemplate ?? "",
        active: participantPayments.active,
        participantName: profile.social_name || profile.full_name || "",
        eventTitle: eventParticipant.event_title ?? "",
        appOrigin: origin,
        cardPaymentsEnabled,
      })
    : null

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
    likert,
    canManagePayments,
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
    likert,
    canManagePayments,
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
      likert={likert}
      showPayments={canManagePayments}
    />
  )
}

export default ViewEventParticipant
