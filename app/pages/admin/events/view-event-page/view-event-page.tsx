import { collect, inputFromForm } from "composable-functions"
import { useEffect } from "react"
import { useFetcher } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import { z as zod } from "zod"
import {
  getAdminContext,
  getAdminEventById,
  getAdminReminderCountByEventId,
  getEventDemographicsById,
  getProfilesWithExtraDataById,
  sendEventReminders,
  updateEventParticipantById,
  updateEventStatus,
  updateEventDemographics,
} from "~/business/admin/admin.server"
import {
  sendEventRemindersSchema,
  updateEventParticipantByIdSchema,
  updateEventStatusSchema,
} from "~/business/admin/common"
import { checkEventStatus } from "~/lib/helpers/check-event-status"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { ComposableFetcherData } from "~types/entities.types"
import type { Route } from "./+types/view-event-page"
import { Buttons } from "./buttons"
import { DatesAndTimes } from "./dates-and-times"
import { DemographicsData } from "./demographics"
import { EventStatusForm } from "./event-status-form"
import { GeneralData } from "./general-data"
import { sendToast } from "./send-toast"
import { AdminViewEventParticipantsTable } from "./view-event-participants-table/view-event-participants-table"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

/** ACTION */
export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)
  const { intent } = await inputFromForm(request)

  if (intent === "update-event-participant") {
    return await formAction({
      request,
      schema: updateEventParticipantByIdSchema,
      mutation: updateEventParticipantById,
      transformResult: (result) => ({ ...result, intent }),
    })
  }

  if (intent === "send-reminders") {
    return await formAction({
      request,
      mutation: sendEventReminders,
      schema: sendEventRemindersSchema,
      transformResult: (result) => ({ ...result, intent }),
    })
  }

  if (intent === "update-event-status") {
    return await formAction({
      request,
      schema: updateEventStatusSchema,
      mutation: updateEventStatus,
      context: { ...context, eventId: params.id },
      transformResult: (result) => ({ ...result, intent }),
    })
  }

  if (intent === "update-demographics") {
    return await formAction({
      request,
      schema: zod.object({ intent: zod.string() }),
      mutation: updateEventDemographics,
      context: { ...context, eventId: params.id },
      transformResult: (result) => ({ ...result, intent }),
    })
  }
}

/** LOADER */
export async function loader({ params }: Route.LoaderArgs) {
  const eventId = params.id
  if (!eventId) {
    throw await redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }
  const result = await getAdminEventById({ eventId })
  if (!result.success) {
    throw await redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }
  const event = result.data

  const { isOpen, isScheduled } = checkEventStatus(event.event_status)

  const eventDemographics =
    event.event_status === "Completed"
      ? getEventDemographicsById
      : () => {
          return
        }

  const resultCollect = await collect({
    participants: getProfilesWithExtraDataById,
    reminderCount: getAdminReminderCountByEventId,
    demographics: eventDemographics,
  })({
    eventId,
    isScheduled,
    isOpen,
  })

  if (!resultCollect.success) {
    return { event, reminderCount: 0, participants: [] }
  }

  const { participants, reminderCount, demographics } = resultCollect.data

  return {
    event,
    reminderCount,
    participants,
    demographics,
  }
}

const AdminViewEventPage = ({ loaderData }: Route.ComponentProps) => {
  const fetcher = useFetcher<ComposableFetcherData>()

  useEffect(() => {
    sendToast(fetcher.data)
  }, [fetcher.data])

  const { event, reminderCount, participants, demographics } = loaderData

  const { title, emoji, time_event_start } = event

  return (
    <>
      <h1>
        {emoji} {title}
      </h1>
      <Buttons event={event} fetcher={fetcher} reminderCount={reminderCount} />

      <p className="font-bold">
        Data: {formatDateTime(time_event_start, "long").full}
      </p>

      <EventStatusForm {...event} fetcher={fetcher} />

      {demographics && (
        <DemographicsData 
          demographics={demographics} 
          fetcher={fetcher}
          eventId={event.id}
        />
      )}

      <div className="max-h-[600px]">
        <AdminViewEventParticipantsTable
          participants={participants}
          eventId={event.id}
          fetcher={fetcher}
        />
      </div>

      <GeneralData {...event} />
      <DatesAndTimes {...event} />
    </>
  )
}

export default AdminViewEventPage
