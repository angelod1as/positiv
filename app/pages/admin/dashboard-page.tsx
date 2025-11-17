import { getEventsForDashboard } from "~/business/admin/admin.server"
import { Separator } from "~/components/ui/separator"
import type { Route } from "./+types/dashboard-page"
import { AdminDashboardEventsTable } from "~/components/organisms/tables/admin/events-table"

export async function loader() {
  const events = await getEventsForDashboard()
  return { events }
}

const AdminDashboard = ({ loaderData }: Route.ComponentProps) => {
  const { events } = loaderData

  return (
    <>
      <h1>Visão geral</h1>
      <div>
        <h2>Eventos</h2>

        {events ? (
          <AdminDashboardEventsTable events={events} />
        ) : (
          "Nenhum evento encontrado"
        )}
      </div>
      <Separator />
      <div>
        <h2>Participantes (em breve)</h2>
      </div>
    </>
  )
}

export default AdminDashboard
