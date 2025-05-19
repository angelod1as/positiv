import { redirectWithError } from "remix-toast"
import { getAdminEventById } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { eventPropNameMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { Route } from "./+types/view-event"

const {
  admin: {
    ADMIN_DASHBOARD,
    events: { ADMIN_EDIT_EVENT },
  },
} = paths

export async function loader({ params, request }: Route.LoaderArgs) {
  const event = await getAdminEventById(request, params)
  if (!event) {
    throw await redirectWithError(ADMIN_DASHBOARD, "Evento não encontrado")
  }
  return { event }
}

const AdminViewEvent = ({ loaderData }: Route.ComponentProps) => {
  const { event } = loaderData

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
      <div className="flex flex-col gap-2">
        <h2>Dados gerais</h2>
        <p>
          {eventPropNameMap("description")}: {description}
        </p>
        <p>
          {eventPropNameMap("event_status")}: {event_status}
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
