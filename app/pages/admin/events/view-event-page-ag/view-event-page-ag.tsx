import { inputFromForm } from "composable-functions"
import { Suspense, useEffect, useState } from "react"
import { Await, useFetcher } from "react-router"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import { z as zod } from "zod"
import {
  getAdminContext,
  getAdminEventById,
  getEventDemographicsById,
  getProfilesWithExtraDataById,
  updateEventParticipantById,
  updateEventStatus,
  updateEventDemographics,
} from "~/business/admin/admin.server"
import { updateEventListmonkList, listmonkSyncFiltersSchema } from "~/business/admin/event-listmonk-sync.server"
import {
  updateEventParticipantByIdSchema,
  updateEventStatusSchema,
} from "~/business/admin/common"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { ComposableFetcherData } from "~types/database/entities.types"
import type { Route } from "./+types/view-event-page-ag"
import { Buttons } from "~/components/pages/admin/events/buttons"
import { DatesAndTimes } from "~/components/pages/admin/events/dates-and-times"
import { DemographicsData } from "~/components/pages/admin/events/demographics"
import { EventStatusForm } from "~/components/pages/admin/events/event-status-form"
import { GeneralData } from "~/components/pages/admin/events/general-data"
import { sendToast } from "../view-event-page/send-toast"
import { AdminViewEventParticipantsTableAG } from "~/components/organisms/tables/admin/participants-table/view-event-participants-table-ag"
import { ParticipantsTableSkeleton } from "~/components/organisms/tables/admin/participants-table/participants-table-skeleton"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

/** ACTION */
export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)
  const { intent } = await inputFromForm(request)

  if (intent === "update-event-participant") {
    console.info("[Action] update-event-participant: starting")
    const result = await formAction({
      request,
      schema: updateEventParticipantByIdSchema,
      mutation: updateEventParticipantById,
      transformResult: (result) => ({ ...result, intent }),
    })
    console.info("[Action] update-event-participant: result", result)
    return result
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
      return { success: false, errors: [{ message: "Event ID not found" }], intent }
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
        errors: filtersValidation.error.issues.map((e) => ({ message: e.message })),
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

  return {
    event,
    participants: loadParticipants(eventId),
    demographics: demographics?.success ? demographics.data : undefined,
  }
}

const AdminViewEventPageAG = ({ loaderData }: Route.ComponentProps) => {
  const fetcher = useFetcher<ComposableFetcherData>()
  const [isListStale, setIsListStale] = useState(false)

  useEffect(() => {
    sendToast(fetcher.data)

    if (!fetcher.data) return

    if (fetcher.data.intent === "update-event-participant" && fetcher.data.success) {
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
      <p className="text-sm text-orange-600 font-medium mb-2">
        [AG Grid Test Page]
      </p>
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

      <div className="max-h-[600px]">
        <Suspense fallback={<ParticipantsTableSkeleton />}>
          <Await
            resolve={participants}
            errorElement={
              <div className="text-red-500">
                Erro ao carregar participantes. Por favor, recarregue a página.
              </div>
            }
          >
            {(resolvedParticipants) => (
              <AdminViewEventParticipantsTableAG
                participants={resolvedParticipants}
                eventId={event.id}
              />
            )}
          </Await>
        </Suspense>
      </div>

      <GeneralData {...event} />
      <DatesAndTimes {...event} />
    </>
  )
}

export default AdminViewEventPageAG
