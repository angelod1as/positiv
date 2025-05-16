import { format } from "date-fns"
import { getAdminContext } from "~/business/admin/admin.server"
import { Button } from "~/components/atoms/button/button"
import paths from "~/lib/paths"
import type { Route } from "./+types/dashboard-page"

const {
  admin: {
    events: { ADMIN_CREATE_EVENT, ADMIN_EVENT },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { events } = await getAdminContext(request, params)
  const sorted = events.sort((a, b) => {
    const startA = a.starting_time
    const startB = b.starting_time
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
        {events.map(({ starting_time, id, title }) => {
          if (!starting_time) return
          const date = new Date(starting_time)
          return (
            <li key={id}>
              <Button to={ADMIN_EVENT(id)} variant="outline">
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
