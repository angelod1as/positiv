import { useEffect } from "react"
import { useFetcher } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import {
  getAdminContext,
  getAdminEventById,
  getAdminReminderCountByEventId,
  getEventDemographicsById,
  sendEventReminders,
  updateEventStatus,
} from "~/business/admin/admin.server"
import {
  sendEventRemindersSchema,
  updateEventStatusSchema,
} from "~/business/admin/common"
import { checkEventStatus } from "~/lib/helpers/check-event-status"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { getFormData } from "~/lib/helpers/get-form-data"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event-page"
import { Buttons } from "./buttons"
import { DatesAndTimes } from "./dates-and-times"
import { EventStatusForm } from "./event-status-form"
import { GeneralData } from "./general-data"
import { sendToast } from "./send-toast"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export type FetcherData =
  | {
      success: boolean
      intent: "send-reminders" | "update-event-status"
      errors?: Record<"_global", string[]>
    }
  | undefined

/** ACTION */
export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)
  const { intent } = await getFormData({
    request,
    values: ["intent"],
  })

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
  const event = {
    ...result.data,
    event_status: result.data.event_status,
  }
  const { isOpen, isScheduled } = checkEventStatus(event.event_status)

  const reminderCountPromise = getAdminReminderCountByEventId({
    eventId,
    isScheduled,
    isOpen,
  })
  const demographicsPromise = getEventDemographicsById({ eventId })

  const [reminderCountResult] = await Promise.all([
    reminderCountPromise,
    demographicsPromise,
  ])

  if (!reminderCountResult?.success) {
    return { event, reminderCount: 0 }
  }

  const reminderCount = reminderCountResult.data

  return { event, reminderCount }
}

const AdminViewEventPage = ({ loaderData }: Route.ComponentProps) => {
  const fetcher = useFetcher<FetcherData>()

  useEffect(() => {
    sendToast(fetcher.data)
  }, [fetcher.data])

  const { event, reminderCount = 0 } = loaderData

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

      <GeneralData {...event} />
      <DatesAndTimes {...event} />
    </>
  )
}

export default AdminViewEventPage
