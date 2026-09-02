import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import { redirectWithError } from "remix-toast"
import {
  getAdminContext,
  getAdminEventById,
  getEventDemographicsById,
  getProfilesWithExtraDataById,
  getRejectedEventParticipants,
} from "~/business/admin/admin.server"
import {
  listmonkSyncFiltersSchema,
  updateEventListmonkList,
} from "~/business/admin/event-listmonk-sync.server"
import { registerManualPayment } from "~/business/payment/manual-payment.server"
import { cancelPayment } from "~/business/payment/payment-cancel.server"
import { markManualRefunded } from "~/business/payment/payment-refund.server"
import { getPaymentsForEvent } from "~/business/payment/payment-totals.server"
import { ManagePaymentModal } from "~/components/organisms/payment/manage-payment-modal"
import { AdminViewEventParticipantsTable } from "~/components/organisms/tables/admin/participants-table/view-event-participants-table"
import { Buttons } from "~/components/pages/admin/events/buttons"
import { DatesAndTimes } from "~/components/pages/admin/events/dates-and-times"
import { DemographicsData } from "~/components/pages/admin/events/demographics"
import { EventStatusForm } from "~/components/pages/admin/events/event-status-form"
import { GeneralData } from "~/components/pages/admin/events/general-data"
import { RejectedParticipantsSection } from "~/components/pages/admin/events/rejected-participants-section"
import { adminEventsCopy } from "~/copy/admin/events"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { holdsPayment } from "~/lib/helpers/payment-status"
import paths from "~/lib/paths"
import type { ComposableFetcherData } from "~types/database/entities.types"
import type { Route } from "./+types/view-event-page"
import { sendToast } from "./send-toast"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

/** ACTION */
export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)

  const formData = await request.formData()
  const intent = String(formData.get("intent") ?? "")

  if (intent === "payment-manual") {
    const result = await registerManualPayment({
      ...Object.fromEntries(formData),
      createdBy: context.currentProfile?.id,
    })
    return {
      success: result.success,
      intent,
      errors: result.success ? undefined : result.errors,
    }
  }

  if (intent === "payment-manual-refund") {
    const result = await markManualRefunded(Object.fromEntries(formData))
    return {
      success: result.success,
      intent,
      errors: result.success ? undefined : result.errors,
    }
  }

  if (intent === "payment-cancel") {
    const result = await cancelPayment(Object.fromEntries(formData))
    return {
      success: result.success,
      intent,
      errors: result.success ? undefined : result.errors,
    }
  }

  if (intent === "sync-listmonk-list") {
    const eventId = params.id
    if (!eventId) {
      return {
        success: false,
        errors: [{ message: "Event ID not found" }],
        intent,
      }
    }

    const approvalStatuses = formData.getAll("approvalStatuses")
    const applicationStatuses = formData.getAll("applicationStatuses")
    const attendanceStatuses = formData.getAll("attendanceStatuses")

    const filtersValidation = listmonkSyncFiltersSchema.safeParse({
      approvalStatuses,
      applicationStatuses,
      attendanceStatuses,
    })

    if (!filtersValidation.success) {
      return {
        success: false,
        errors: filtersValidation.error.issues.map((e) => ({
          message: e.message,
        })),
        intent,
      }
    }

    const filters = filtersValidation.data
    const result = await updateEventListmonkList(eventId, filters)
    return { ...result, intent }
  }

  return {
    success: false,
    errors: [{ message: "Unknown intent" }],
    intent,
  }
}

async function loadParticipants(eventId: string) {
  const result = await getProfilesWithExtraDataById({ eventId })

  if (!result.success) {
    throw new Error(adminEventsCopy.viewEvent.loadParticipantsFailed)
  }

  return result.data
}

/** LOADER */
export async function loader({ params }: Route.LoaderArgs) {
  const eventId = params.id
  if (!eventId) {
    throw await redirectWithError(
      ADMIN_DASHBOARD,
      adminEventsCopy.eventNotFound,
    )
  }
  const result = await getAdminEventById({ eventId })
  if (!result.success) {
    throw await redirectWithError(
      ADMIN_DASHBOARD,
      adminEventsCopy.eventNotFound,
    )
  }
  const event = result.data

  const demographics =
    event.event_status === "Completed"
      ? await getEventDemographicsById({ eventId })
      : undefined

  const [participants, rejectedParticipants, paymentsByParticipant] =
    await Promise.all([
      loadParticipants(eventId),
      getRejectedEventParticipants(eventId).catch((err) => {
        console.error("Failed to fetch rejected participants", err)
        return []
      }),
      getPaymentsForEvent(eventId),
    ])

  return {
    event,
    participants,
    rejectedParticipants,
    paymentsByParticipant,
    demographics: demographics?.success ? demographics.data : undefined,
  }
}

const AdminViewEventPage = ({ loaderData }: Route.ComponentProps) => {
  const fetcher = useFetcher<ComposableFetcherData>()
  const [isListStale, setIsListStale] = useState(false)
  const [managedParticipantId, setManagedParticipantId] = useState<
    string | null
  >(null)

  useEffect(() => {
    sendToast(fetcher.data)

    if (!fetcher.data) return

    if (fetcher.data.intent === "sync-listmonk-list" && fetcher.data.success) {
      setIsListStale(false)
    }
  }, [fetcher.data])

  const {
    event,
    participants,
    rejectedParticipants,
    paymentsByParticipant,
    demographics,
  } = loaderData

  const { title, emoji, time_event_start } = event

  const managedParticipant = participants.find(
    (participant) => participant.id === managedParticipantId,
  )
  const managedPayments = managedParticipantId
    ? (paymentsByParticipant[managedParticipantId] ?? [])
    : []

  return (
    <>
      <h1>
        {emoji} {title}
      </h1>
      <Buttons
        event={event}
        participants={participants}
        isListStale={isListStale}
        fetcher={fetcher}
      />

      <p className="font-bold">
        {adminEventsCopy.viewEvent.date(
          formatDateTime(time_event_start, "long").full,
        )}
      </p>

      <EventStatusForm {...event} />

      {demographics && (
        <DemographicsData demographics={demographics} eventId={event.id} />
      )}

      <div>
        <AdminViewEventParticipantsTable
          participants={participants}
          eventId={event.id}
          onParticipantSaved={() => setIsListStale(true)}
          onManagePayment={setManagedParticipantId}
        />
        <RejectedParticipantsSection participants={rejectedParticipants} />
      </div>

      {managedParticipant && (
        <ManagePaymentModal
          open
          onOpenChange={(open) => !open && setManagedParticipantId(null)}
          eventParticipantId={managedParticipant.id}
          participantName={
            managedParticipant.social_name || managedParticipant.full_name || ""
          }
          payments={managedPayments}
          totals={{
            paid_gross: managedParticipant.paid_gross,
            refunded: managedParticipant.refunded,
            fee: managedParticipant.fee,
            net: managedParticipant.net,
            has_paid: holdsPayment(managedParticipant.payment_status),
            current_status: managedParticipant.payment_status,
          }}
          active={
            managedPayments.find(
              (payment) => payment.id === managedParticipant.active_payment_id,
            ) ?? null
          }
        />
      )}

      <GeneralData {...event} />
      <DatesAndTimes {...event} />
    </>
  )
}

export default AdminViewEventPage
