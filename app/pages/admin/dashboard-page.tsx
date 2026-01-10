import { getEventsForDashboard } from "~/business/admin/admin.server"
import { EventCard } from "~/components/organisms/event-card/event-card"
import { Separator } from "~/components/ui/separator"
import type { Route } from "./+types/dashboard-page"
import { AdminDashboardEventsTable } from "~/components/organisms/tables/admin/events-table"

export async function loader() {
  const events = await getEventsForDashboard()
  return { events }
}

const AdminDashboard = ({ loaderData }: Route.ComponentProps) => {
  const { events } = loaderData

  const openEvents = events
    .filter((event) => event.event_status === "Registration Open")
    .slice(0, 3)

  return (
    <>
      <h1>Visão geral</h1>

      {openEvents.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2>Eventos com inscrições abertas</h2>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {openEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isAdmin={true}
                data-testid="admin-event-card"
              />
            ))}
          </div>
        </div>
      )}

      {events && <AdminDashboardEventsTable events={events} />}
      <Separator />
      <div>
        <h2>Participantes (em breve)</h2>
      </div>
    </>
  )
}

export default AdminDashboard
