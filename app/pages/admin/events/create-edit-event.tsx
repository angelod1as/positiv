import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import {
  createOrUpdateEvent,
  getAdminContext,
  getAdminEventById,
} from "~/business/admin/admin.server"
import { eventFormSchema } from "~/business/admin/common"
import { EventForm } from "~/components/forms/admin/event-form"
import { adminEventsCopy } from "~/copy/admin/events"
import paths from "~/lib/paths"
import type { Route } from "./+types/create-edit-event"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT },
  },
} = paths

export async function loader({ params }: Route.LoaderArgs) {
  const eventId = params.id
  if (!eventId) return { event: undefined }
  const result = await getAdminEventById({ eventId })

  if (!result.success) {
    return { event: undefined }
  }

  return { event: result.data }
}

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)
  const eventId = params.id
  return formAction({
    request,
    schema: eventFormSchema,
    mutation: createOrUpdateEvent,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(
          ADMIN_VIEW_EVENT(result.data),
          adminEventsCopy.createEdit.saved(Boolean(eventId)),
        )
      }
      return result
    },
    context: { ...context, eventId },
  })
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
