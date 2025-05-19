import { format } from "date-fns"
import { getAdminContext } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import paths from "~/lib/paths"
import type { Route } from "./+types/events"

const {
  admin: {
    events: { ADMIN_CREATE_EVENT, ADMIN_VIEW_EVENT },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { events } = await getAdminContext(request, params)
  const sorted = events.sort((a, b) => {
    const startA = a.time_event_start
    const startB = b.time_event_start
    if (!startA || !startB) {
      return -1
    }

    return new Date(startA).getTime() - new Date(startB).getTime()
  })
  return { events: sorted }
}

const AdminDashboard = ({ loaderData }: Route.ComponentProps) => {
  const { events } = loaderData
  return (
    <>
      <Button to={ADMIN_CREATE_EVENT}>Criar novo evento</Button>
      <ul>
        {events.map(({ time_event_start, id, title }) => {
          if (!time_event_start) return
          const date = new Date(time_event_start)
          return (
            <li key={id}>
              <Button to={ADMIN_VIEW_EVENT(id)} variant="outline">
                +
              </Button>{" "}
              {format(date, "dd-MM-yyyy")} - {title}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default AdminDashboard
