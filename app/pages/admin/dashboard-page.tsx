import type { ViewEvent } from "~types/entities.types"
import { getNextEvents } from "../homepage/fetch/get-next-events"
import type { Route } from "./+types/dashboard-page"
import { AdminDashboardEventsTable } from "./events-table/admin-dashboard-events-table"

const sortEvents = (a: ViewEvent, b: ViewEvent) => {
  const startA = a.time_event_start
  const startB = b.time_event_start
  if (!startA || !startB) {
    return -1
  }

  return new Date(startA).getTime() - new Date(startB).getTime()
}

export async function loader({}: Route.LoaderArgs) {
  const eventsResult = await getNextEvents(undefined, 12)

  const events = eventsResult.success ? eventsResult.data.sort(sortEvents) : []

  return { events }
}

const AdminDashboard = ({ loaderData }: Route.ComponentProps) => {
  const { events } = loaderData

  return (
    <>
      <h1>Visão geral</h1>
      <div>
        <h2>Eventos</h2>

        {events.length > 0 ? (
          <AdminDashboardEventsTable events={events} />
        ) : (
          "Nenhum evento encontrado"
        )}
      </div>
    </>
  )
}

export default AdminDashboard
