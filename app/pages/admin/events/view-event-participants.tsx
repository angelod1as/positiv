import { redirectWithError } from "remix-toast"
import {
  getAdminContext,
  getAdminEventById,
  getAdminParticipantsWithExtraDataById,
  updateParticipantProperty,
} from "~/business/admin/admin.server"
import { updateParticipantPropertySchema } from "~/business/admin/common"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event-participants"
import { AdminEventParticipantsTable } from "./event-participants-table.tsx/admin-event-participants-table"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export async function action({ request, params }: Route.ActionArgs) {
  await getAdminContext(request, params)
  const formData = await request.formData()

  const eventId = params.id
  if (!eventId) {
    return { success: false, error: "Event ID is required" }
  }

  // Parse and validate the form data
  const rawData = {
    participantId: formData.get("participantId")?.toString() || "",
    property: formData.get("property")?.toString() || "",
    value: formData.get("value") === "true",
  }

  const validation = updateParticipantPropertySchema.safeParse(rawData)

  if (!validation.success) {
    return {
      success: false,
      error: "Invalid form data",
      issues: validation.error.issues,
    }
  }

  const { participantId, property, value } = validation.data

  try {
    const result = await updateParticipantProperty(
      eventId,
      participantId,
      property,
      value,
    )

    return { success: !!result }
  } catch (_error) {
    return {
      success: false,
      error: "Failed to update participant property",
    }
  }
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const event = await getAdminEventById(request, params)
  if (!event) {
    throw await redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }

  const participantsResponse = await getAdminParticipantsWithExtraDataById(
    event.id,
  )

  if (!participantsResponse.success || !participantsResponse.data) {
    return { event, participants: [] }
  }

  return { event, participants: participantsResponse.data }
}

const AdminViewEventParticipants = ({ loaderData }: Route.ComponentProps) => {
  const { event, participants } = loaderData
  return (
    <div>
      <h1>Participantes</h1>
      <p>
        {event.emoji} {event.title} -{" "}
        {formatDateTime(event.time_event_start).date}
      </p>
      <AdminEventParticipantsTable
        participants={participants}
        eventId={event.id}
      />
    </div>
  )
}

export default AdminViewEventParticipants
