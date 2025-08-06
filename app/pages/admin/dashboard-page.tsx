import { getAdminContext } from "~/business/admin/admin.server"
import { Separator } from "~/components/ui/separator"
import type { Event } from "~types/database/entities.types"
import type { Route } from "./+types/dashboard-page"
import { AdminDashboardEventsTable } from "~/components/organisms/tables/admin/events-table"
import { Link } from "react-router"
import { Button } from "~/components/ui/button"
import { Mail } from "lucide-react"

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
  return { events: sorted as Event[] }
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
        <h2>Newsletters</h2>
        <p className="text-muted-foreground mb-4">
          Gerencie e envie newsletters para a comunidade
        </p>
        <Link to="/admin/newsletters">
          <Button>
            <Mail className="mr-2 h-4 w-4" />
            Gerenciar Newsletters
          </Button>
        </Link>
      </div>
      <Separator />
      <div>
        <h2>Participantes (em breve)</h2>
      </div>
    </>
  )
}

export default AdminDashboard
