import { Link } from "react-router"
import {
  getEventsForDashboard,
  getRecentProfiles,
} from "~/business/admin/admin.server"
import { getRecentFeedbacks } from "~/business/feedback/feedback.server"
import {
  cleanupListmonkTestCampaign,
  testListmonkConnection,
} from "~/business/newsletter/test-listmonk-connection.server"
import { EventCard } from "~/components/organisms/event-card/event-card"
import { AdminDashboardEventsTable } from "~/components/organisms/tables/admin/events-table"
import { RecentFeedbacksTable } from "~/components/organisms/tables/admin/recent-feedbacks-table"
import { RecentProfilesTable } from "~/components/organisms/tables/admin/recent-profiles-table"
import { ListmonkDiagnosticSection } from "~/components/pages/admin/listmonk-diagnostic-section"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { adminDashboardCopy } from "~/copy/admin"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/dashboard-page"

const {
  admin: { ADMIN_PARTICIPANTS, ADMIN_FEEDBACKS },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.adminDashboard.title)
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "test-listmonk") {
    const diagnosticResult = await testListmonkConnection()
    return { intent: "test-listmonk", diagnosticResult }
  }

  if (intent === "cleanup-listmonk") {
    const campaignId = Number(formData.get("campaignId"))
    const cleanupResult = await cleanupListmonkTestCampaign(campaignId)
    return { intent: "cleanup-listmonk", cleanupResult }
  }

  return { intent }
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
      <h1>{adminDashboardCopy.title}</h1>

      {activeEvents.length > 0 && (
        <div className="flex flex-col gap-8">
          <h2>{adminDashboardCopy.activeEventsTitle}</h2>
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
          <h2>{adminDashboardCopy.recentProfiles.title}</h2>
          <div className="grid grid-cols-1">
            <Button asChild>
              <Link to={ADMIN_PARTICIPANTS}>
                {adminDashboardCopy.recentProfiles.cta}
              </Link>
            </Button>
            <p className="text-xs">{adminDashboardCopy.recentProfiles.hint}</p>
          </div>
        </div>

        <RecentProfilesTable profiles={recentProfiles} />
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2>{adminDashboardCopy.recentFeedbacks.title}</h2>
          <div className="grid grid-cols-1">
            <Button asChild>
              <Link to={ADMIN_FEEDBACKS}>
                {adminDashboardCopy.recentFeedbacks.cta}
              </Link>
            </Button>
          </div>
        </div>

        <RecentFeedbacksTable feedbacks={recentFeedbacks} />
      </div>

      <Separator />

      <ListmonkDiagnosticSection />

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
