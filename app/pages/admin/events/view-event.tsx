import { useEffect } from "react"
import { formAction } from "remix-forms"
import { redirectWithError } from "remix-toast"
import { toast } from "sonner"
import {
  getAdminContext,
  getAdminEventById,
  updateEventStatus,
} from "~/business/admin/admin.server"
import { updateEventStatusSchema } from "~/business/admin/common"
import { Button } from "~/components/atoms/button/button"
import { SchemaForm } from "~/components/forms/schema-form"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { eventPropNameMap, eventStatusMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event"

const {
  admin: {
    ADMIN_DASHBOARD,
    events: { ADMIN_EDIT_EVENT },
  },
} = paths

export async function action({ request, params }: Route.ActionArgs) {
  const context = await getAdminContext(request, params)

  return formAction({
    request,
    schema: updateEventStatusSchema,
    mutation: updateEventStatus,
    context: { ...context, eventId: params.id },
  })
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const event = await getAdminEventById(request, params)
  if (!event) {
    throw await redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }
  return { event }
}

const AdminViewEvent = ({ loaderData, actionData }: Route.ComponentProps) => {
  const { event } = loaderData

  useEffect(() => {
    if (actionData?.success) {
      toast.success("Salvo com sucesso")
    }
  }, [actionData])

  const {
    id,
    title,
    description,
    emoji,
    event_status,
    location,
    ticket_price,
    total_spots,
    time_application_start,
    time_application_end,
    time_event_end,
    time_event_start,
    time_group_end,
    time_group_start,
    time_interviews_end,
    time_interviews_start,
    time_payment_end,
    time_payment_start,
  } = event

  return (
    <>
      <h1>
        {emoji} {title}
      </h1>
      <Button to={ADMIN_EDIT_EVENT(id)}>Editar</Button>
      <p className="font-bold">
        Data: {formatDateTime(time_event_start, "long").full}
      </p>
      <SchemaForm
        schema={updateEventStatusSchema}
        labels={{ event_status: "Status do evento" }}
        values={{
          event_status,
        }}
        mode="onChange"
        options={{
          event_status: [
            { value: "Draft", name: eventStatusMap("Draft") },
            { value: "Completed", name: eventStatusMap("Completed") },
            { value: "Cancelled", name: eventStatusMap("Cancelled") },
            { value: "Scheduled", name: eventStatusMap("Scheduled") },
            {
              value: "Registration Closed",
              name: eventStatusMap("Registration Closed"),
            },
            {
              value: "Registration Open",
              name: eventStatusMap("Registration Open"),
            },
          ],
        }}
      >
        {({ Field, submit }) => <Field name="event_status" onChange={submit} />}
      </SchemaForm>
      <div className="flex flex-col gap-2">
        <h2>Dados gerais</h2>
        <p>
          {eventPropNameMap("description")}: {description}
        </p>
        <p>
          {eventPropNameMap("location")}: {location}
        </p>
        <p>
          {eventPropNameMap("ticket_price")}: R$ {ticket_price}
        </p>
        <p>
          {eventPropNameMap("total_spots")}: {total_spots}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <h2>Datas e horários</h2>
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr>
              <th />
              <th className="font-bold">Início</th>
              <th className="font-bold">Fim</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">Inscrições</td>
              <td>{formatDateTime(time_application_start).date}</td>
              <td>{formatDateTime(time_application_end).date}</td>
            </tr>
            <tr>
              <td className="font-bold">Entrevistas</td>
              <td>{formatDateTime(time_interviews_start).date}</td>
              <td>{formatDateTime(time_interviews_end).date}</td>
            </tr>
            <tr>
              <td className="font-bold">Pagamento</td>
              <td>{formatDateTime(time_payment_start).date}</td>
              <td>{formatDateTime(time_payment_end).date}</td>
            </tr>
            <tr>
              <td className="font-bold">Grupo</td>
              <td>{formatDateTime(time_group_start).date}</td>
              <td>{formatDateTime(time_group_end).date}</td>
            </tr>
            <tr>
              <td className="font-bold">Evento</td>
              <td>{formatDateTime(time_event_start).date}</td>
              <td>{formatDateTime(time_event_end).date}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

export default AdminViewEvent
