import type { ShouldRevalidateFunctionArgs } from "react-router"
import { redirectWithError } from "remix-toast"
import {
  getEventParticipantBasic,
  getParticipantFullEventHistory,
  getProfileById,
  updateEventParticipantById,
  updateProfileAdminNotes,
  updateProfileApprovalStatus,
} from "~/business/admin/admin.server"
import {
  getLatestPaymentRequest,
  syncManualPaymentStatus,
} from "~/business/payment/payment-request.server"
import {
  handlePaymentStatusChange,
  processRefund,
  resolvePaymentRequest,
} from "~/business/payment/trigger-payment-request.server"
import { ParticipantDetail } from "~/components/pages/admin/participants/participant-detail"
import paths from "~/lib/paths"
import type { ParticipantEventHistoryData } from "~types/database/entities.types"
import type { Route } from "./+types/view-event-participant"

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
    const result = await updateProfileApprovalStatus(
      Object.fromEntries(formData),
    )
    return { success: result.success }
  }

  if (intent === "update-profile-admin-notes") {
    const result = await updateProfileAdminNotes(Object.fromEntries(formData))
    return {
      success: result.success,
      errors: result.success ? undefined : result.errors,
    }
  }

  if (intent === "update-event-participant") {
    const entries = Object.fromEntries(formData)
    const result = await updateEventParticipantById(entries)
    if (!result.success) {
      return { success: false, errors: result.errors }
    }

    if (entries.has_paid !== undefined || entries.payment !== undefined) {
      await syncManualPaymentStatus(
        entries.id as string,
        entries.has_paid === "true",
        entries.payment !== undefined ? Number(entries.payment) : undefined,
      )
    }

    if (entries.application_status !== "sent_payment_data")
      return { success: true }

    // When application_status changes to "sent_payment_data", we create a payment request
    // and send the payment link email. If this fails, we return success: false even though
    // the DB update succeeded — because from the admin's perspective, the intent was to
    // trigger payment and that part failed. The auto-save form will show the error toast.
    const payment = await handlePaymentStatusChange({
      applicationStatus: entries.application_status as string | undefined,
      eventParticipantId: entries.id as string,
      eventId: entries.event_id as string,
      profileId: entries.profile_id as string,
      customAmount: entries.custom_amount ? Number(entries.custom_amount) : undefined,
    })
    if (payment.triggered && !payment.success) {
      return {
        success: false,
        errors: {
          _global: [
            "Status atualizado, mas houve um erro ao enviar o link de pagamento. Tente novamente.",
          ],
        },
      }
    }

    return { success: true, paymentSent: true }
  }

  if (intent === "resend-payment-link") {
    const entries = Object.fromEntries(formData)
    const customAmount = entries.custom_amount
      ? Number(entries.custom_amount)
      : undefined
    const result = await resolvePaymentRequest(
      entries.id as string,
      entries.event_id as string,
      entries.profile_id as string,
      customAmount,
    )
    return {
      success: result.success,
      paymentSent: result.success,
    }
  }

  if (intent === "refund-payment") {
    const entries = Object.fromEntries(formData)
    const result = await processRefund(entries.id as string)
    return { success: result.success }
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
    console.error(
      "Error fetching event participant:",
      eventParticipantResult.errors,
    )
    return redirectWithError(
      "Participante não inscrite neste evento.",
      ADMIN_VIEW_EVENT(eventId),
    )
  }

  const eventParticipant = eventParticipantResult.data

  const [historyResult, paymentRequestResult] = await Promise.all([
    getParticipantFullEventHistory({
      profileId: profile.id,
      excludeEventId: eventId,
    }),
    getLatestPaymentRequest(eventParticipant.id),
  ])

  const fullHistory: ParticipantEventHistoryData[] = historyResult.success
    ? historyResult.data
    : []

  const paymentRequest = paymentRequestResult.success
    ? paymentRequestResult.data
    : null

  return {
    profile,
    eventParticipant,
    fullHistory,
    eventId,
    paymentRequest,
  }
}

const ViewEventParticipant = ({ loaderData }: Route.ComponentProps) => {
  const { eventParticipant, profile, fullHistory, eventId, paymentRequest } = loaderData

  if (!profile) return null

  return (
    <ParticipantDetail
      profile={profile}
      fullHistory={fullHistory}
      currentEvent={{
        data: eventParticipant,
        eventId,
      }}
      paymentRequest={paymentRequest}
    />
  )
}

export default ViewEventParticipant
