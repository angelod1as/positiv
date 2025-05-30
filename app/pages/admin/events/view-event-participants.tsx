import { redirectWithError } from "remix-toast"
import {
  getAdminEventById,
  getAdminParticipantsWithExtraDataById,
} from "~/business/admin/admin.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event-participants"
import { AdminEventParticipantsTable } from "./event-participants-table.tsx/admin-event-participants-table"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

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
      <AdminEventParticipantsTable
        participants={participants}
        eventId={event.id}
      />
    </div>
  )
}

export default AdminViewEventParticipants
