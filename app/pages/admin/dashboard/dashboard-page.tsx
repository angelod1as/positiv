import { Link } from "react-router"
import {
  getEventsForDashboard,
  getRecentProfiles,
} from "~/business/admin/admin.server"
import { getRecentFeedbacks } from "~/business/feedback/feedback.server"
import { EventCard } from "~/components/organisms/event-card/event-card"
import { AdminDashboardEventsTable } from "~/components/organisms/tables/admin/events-table"
import { RecentFeedbacksTable } from "~/components/organisms/tables/admin/recent-feedbacks-table"
import { RecentProfilesTable } from "~/components/organisms/tables/admin/recent-profiles-table"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/dashboard-page"

const {
  admin: { ADMIN_PARTICIPANTS, ADMIN_FEEDBACKS, ADMIN_DATAVIZ },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Admin - Visão Geral")
}

export async function loader() {
  const [events, recentProfiles, feedbacksResult] = await Promise.all([
    getEventsForDashboard(),
    getRecentProfiles(),
    getRecentFeedbacks(10),
  ])
  return {
    events,
    recentProfiles,
    recentFeedbacks: feedbacksResult.success ? feedbacksResult.data : [],
  }
}

const AdminDashboard = ({ loaderData }: Route.ComponentProps) => {
  const { events, recentProfiles, recentFeedbacks } = loaderData

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
        <div className="flex flex-col gap-8">
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

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2>Feedbacks recentes</h2>
          <div className="grid grid-cols-1">
            <Button asChild>
              <Link to={ADMIN_FEEDBACKS}>Ver todos os feedbacks</Link>
            </Button>
          </div>
        </div>

        <RecentFeedbacksTable feedbacks={recentFeedbacks} />
      </div>

      <Separator />

      {/* Commented out for now, we need to see the charts in production */}
      {/* <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2>Números e métricas</h2>
          <div className="grid grid-cols-1">
            <Button asChild>
              <Link to={ADMIN_DATAVIZ}>Ver números</Link>
            </Button>
            <p className="text-xs">
              Veja todos os gráficos e métricas da comunidade
            </p>
          </div>
        </div>
      </div> */}
    </>
  )
}

export default AdminDashboard
