import { getAdminEventById } from "~/business/admin/admin.server"
import { EventForm } from "~/components/forms/admin/event-form"
import { adminEventsCopy } from "~/copy/admin/events"
import type { Route } from "./+types/create-edit-event"

export async function loader({ params }: Route.LoaderArgs) {
  const eventId = params.id
  if (!eventId) return { event: undefined }
  const result = await getAdminEventById({ eventId })

  if (!result.success) {
    return { event: undefined }
  }

  return { event: result.data }
}

const AdminCreateEditEvent = ({ loaderData }: Route.ComponentProps) => {
  const { event } = loaderData
  return (
    <>
      {event ? (
        <h1>{adminEventsCopy.createEdit.editTitle}</h1>
      ) : (
        <h1>{adminEventsCopy.createEdit.createTitle}</h1>
      )}

      <EventForm event={event} />
    </>
  )
}

export default AdminCreateEditEvent
