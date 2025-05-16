import { formAction } from "remix-forms"
import { redirectWithSuccess } from "remix-toast"
import {
  createOrUpdateEvent,
  getAdminEventById,
} from "~/business/admin/admin.server"
import { eventFormSchema } from "~/business/admin/common"
import { getUserContext } from "~/business/auth/auth.server"
import { EventForm } from "~/components/forms/admin/event-form"
import paths from "~/lib/paths"
import type { Route } from "./+types/event"

const {
  admin: {
    events: { ADMIN_EVENT },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) return { event: undefined }
  const event = await getAdminEventById(request, params)
  return { event }
}

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getUserContext(request, params)
  return formAction({
    request,
    schema: eventFormSchema,
    mutation: createOrUpdateEvent,
    transformResult: async (result) => {
      if (result.success) {
        throw await redirectWithSuccess(
          ADMIN_EVENT(result.data),
          "Evento criado com sucesso",
        )
      }
      return result
    },
    context,
  })
}

const AdminEvent = ({ loaderData }: Route.ComponentProps) => {
  const { event } = loaderData
  return (
    <>
      {event ? <h1>Editar evento</h1> : <h1>Criar novo evento</h1>}

      <EventForm event={event} />
    </>
  )
}

export default AdminEvent
