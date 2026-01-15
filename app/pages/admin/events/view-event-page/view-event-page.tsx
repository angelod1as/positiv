import { inputFromForm } from "composable-functions"
import { useEffect, useState } from "react"
import { useFetcher, type ShouldRevalidateFunctionArgs } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import { z as zod } from "zod"
import {
  getAdminContext,
  getAdminEventById,
  getEventDemographicsById,
  getProfilesWithExtraDataById,
  updateEventDemographics,
  updateEventParticipantById,
  updateEventStatus,
} from "~/business/admin/admin.server"
import {
  updateEventParticipantByIdSchema,
  updateEventStatusSchema,
} from "~/business/admin/common"
import {
  listmonkSyncFiltersSchema,
  updateEventListmonkList,
} from "~/business/admin/event-listmonk-sync.server"
import { AdminViewEventParticipantsTable } from "~/components/organisms/tables/admin/participants-table/view-event-participants-table"
import { Buttons } from "~/components/pages/admin/events/buttons"
import { DatesAndTimes } from "~/components/pages/admin/events/dates-and-times"
import { DemographicsData } from "~/components/pages/admin/events/demographics"
import { EventStatusForm } from "~/components/pages/admin/events/event-status-form"
import { GeneralData } from "~/components/pages/admin/events/general-data"
import { formatDateTime } from "~/lib/helpers/format-date-time"
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
  const { intent } = await inputFromForm(request)

  if (intent === "update-event-participant") {
    return await formAction({
      request,
      schema: updateEventParticipantByIdSchema,
      mutation: updateEventParticipantById,
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

  if (intent === "sync-listmonk-list") {
    const eventId = params.id
    if (!eventId) {
      return {
        success: false,
        errors: [{ message: "Event ID not found" }],
        intent,
      }
    }

    const formData = await request.formData()
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

/** SHOULD REVALIDATE
 * Prevents loader revalidation after inline participant edits.
 * This stops AG Grid from re-sorting when a cell value is updated.
 */
export function shouldRevalidate({
  actionResult,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
  const result = actionResult as { intent?: string } | undefined
  if (result?.intent === "update-event-participant") {
    return false
  }
  return defaultShouldRevalidate
}

async function loadParticipants(eventId: string) {
  const result = await getProfilesWithExtraDataById({ eventId })

  if (!result.success) {
    throw new Error("Falha ao carregar participantes")
  }

  return result.data
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

  const demographics =
    event.event_status === "Completed"
      ? await getEventDemographicsById({ eventId })
      : undefined

  const participants = await loadParticipants(eventId)

  return {
    event,
    participants,
    demographics: demographics?.success ? demographics.data : undefined,
  }
}

const AdminViewEventPage = ({ loaderData }: Route.ComponentProps) => {
  const fetcher = useFetcher<ComposableFetcherData>()
  const [isListStale, setIsListStale] = useState(false)

  useEffect(() => {
    sendToast(fetcher.data)

    if (!fetcher.data) return

    if (
      fetcher.data.intent === "update-event-participant" &&
      fetcher.data.success
    ) {
      setIsListStale(true)
    }

    if (fetcher.data.intent === "sync-listmonk-list" && fetcher.data.success) {
      setIsListStale(false)
    }
  }, [fetcher.data])

  const { event, participants, demographics } = loaderData

  const { title, emoji, time_event_start } = event

  return (
    <>
      <h1>
        {emoji} {title}
      </h1>
      <Buttons event={event} isListStale={isListStale} fetcher={fetcher} />

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

      <div>
        <AdminViewEventParticipantsTable
          participants={participants}
          eventId={event.id}
        />
      </div>

      <GeneralData {...event} />
      <DatesAndTimes {...event} />
    </>
  )
}

export default AdminViewEventPage
