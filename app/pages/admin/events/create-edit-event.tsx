import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import {
  createOrUpdateEvent,
  getAdminContext,
  getSupabaseAdminEventById,
} from "~/business/admin/admin.server"
import { eventFormSchema } from "~/business/admin/common"
import { EventForm } from "~/components/forms/admin/event-form"
import paths from "~/lib/paths"
import type { Route } from "./+types/create-edit-event"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) return { event: undefined }
  const event = await getSupabaseAdminEventById(request, params)
  return { event }
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
          `Evento ${eventId ? "atualizado" : "criado"} com sucesso`,
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
      {event ? <h1>Editar evento</h1> : <h1>Criar novo evento</h1>}

      <EventForm event={event} />
    </>
  )
}

export default AdminCreateEditEvent
