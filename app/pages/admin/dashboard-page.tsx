import { Link } from "react-router"
import {
  getEventsForDashboard,
  getRecentProfiles,
} from "~/business/admin/admin.server"
import { EventCard } from "~/components/organisms/event-card/event-card"
import { AdminDashboardEventsTable } from "~/components/organisms/tables/admin/events-table"
import { RecentProfilesTable } from "~/components/organisms/tables/admin/recent-profiles-table"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import paths from "~/lib/paths"
import type { Route } from "./+types/dashboard-page"

const {
  admin: { ADMIN_PARTICIPANTS },
} = paths

export async function loader() {
  const [events, recentProfiles] = await Promise.all([
    getEventsForDashboard(),
    getRecentProfiles(),
  ])
  return { events, recentProfiles }
}

const AdminDashboard = ({ loaderData }: Route.ComponentProps) => {
  const { events, recentProfiles } = loaderData

  const activeEvents = events
    .filter(
      (event) =>
        event.event_status === "Registration Open" ||
        event.event_status === "Registration Closed",
    )
    .slice(0, 3)

  return (
    <>
      <h1>Visão geral</h1>

      {activeEvents.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2>Eventos com inscrições abertas</h2>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {activeEvents.map((event) => (
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2>Participantes recentes</h2>
          <div className="grid grid-cols-1">
            <Button asChild>
              <Link to={ADMIN_PARTICIPANTS}>Ver todos os perfis</Link>
            </Button>
            <p className="text-xs">
              Veja a tabela completa para editar os dados
            </p>
          </div>
        </div>

        <RecentProfilesTable profiles={recentProfiles} />
      </div>
    </>
  )
}

export default AdminDashboard
