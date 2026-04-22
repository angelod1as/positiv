import type { ShouldRevalidateFunctionArgs } from "react-router"
import { redirectWithError } from "remix-toast"
import { getUserContext } from "~/business/auth/auth.server"
import { requireAdmin } from "~/business/auth/guards.server"
import {
  getEventParticipantBasic,
  getParticipantFullEventHistory,
  getProfileById,
  updateEventParticipantById,
  updateProfileAdminNotes,
  updateProfileApprovalStatus,
} from "~/business/admin/admin.server"
import {
  cancelActivePaymentRequest,
  getLatestPaymentRequest,
  markManualPaymentPaid,
  markManualPaymentRefunded,
  updatePaymentRequestAmount,
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

export async function action({ request, params }: Route.ActionArgs) {
  // Layout loader-level admin checks do NOT gate actions in React Router 7:
  // the action runs before loaders revalidate. Enforce admin role here
  // so mutation side effects require authorization.
  const { currentProfile } = await getUserContext(request, params)
  requireAdmin(currentProfile)

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
      paymentMode: entries.payment_mode as "automatic" | "manual" | undefined,
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
    const id = entries.id as string
    const eventId = entries.event_id as string
    const profileId = entries.profile_id as string
    if (!id || !eventId || !profileId) return { success: false }
    const customAmount = entries.custom_amount
      ? Number(entries.custom_amount)
      : undefined
    const result = await resolvePaymentRequest(
      id,
      eventId,
      profileId,
      customAmount,
    )
    return {
      success: result.success,
      paymentSent: result.success,
    }
  }

  if (intent === "refund-payment") {
    const entries = Object.fromEntries(formData)
    const id = entries.id as string
    if (!id) return { success: false }
    const result = await processRefund(id)
    return { success: result.success }
  }

  if (intent === "mark-manual-payment-paid") {
    const entries = Object.fromEntries(formData)
    const id = entries.id as string
    if (!id) return { success: false }
    try {
      await markManualPaymentPaid(id)
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  if (intent === "mark-manual-payment-refunded") {
    const entries = Object.fromEntries(formData)
    const id = entries.id as string
    if (!id) return { success: false }
    try {
      await markManualPaymentRefunded(id)
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  if (intent === "cancel-payment") {
    const entries = Object.fromEntries(formData)
    const id = entries.id as string
    if (!id) return { success: false }
    try {
      await cancelActivePaymentRequest(id)
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  if (intent === "update-manual-payment-amount") {
    const entries = Object.fromEntries(formData)
    const id = entries.id as string
    if (!id) return { success: false }
    const amount = Number(entries.amount)
    if (isNaN(amount) || amount <= 0) {
      return { success: false }
    }
    try {
      await updatePaymentRequestAmount(id, amount)
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  // Unknown intent — fail closed so the caller gets a deterministic response.
  return { success: false }
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
