import { getAdminContext } from "~/business/admin/admin.server"
import { Separator } from "~/components/ui/separator"
import type { Route } from "./+types/dashboard-page"
import AdminDashboardEventsTable from "./admin-dashboard-events-table"

export async function loader({ request, params }: Route.LoaderArgs) {
  const { events } = await getAdminContext(request, params)
  if (!events) return { events: undefined }

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
      <h1>Visão geral</h1>
      <div>
        <h2>Eventos</h2>

        <AdminDashboardEventsTable events={events} />
      </div>
      <Separator />
      <div>
        <h2>Participantes (em breve)</h2>
      </div>
    </>
  )
}

export default AdminDashboard
