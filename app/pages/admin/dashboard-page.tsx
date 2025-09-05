import { getAdminContext } from "~/business/admin/admin.server"
import { Separator } from "~/components/ui/separator"
import type { Event } from "~types/database/entities.types"
import type { Route } from "./+types/dashboard-page"
import { AdminDashboardEventsTable } from "~/components/organisms/tables/admin/events-table"
import { Link, useSearchParams } from "react-router"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Mail } from "lucide-react"

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const showAllEvents = url.searchParams.get('showAllEvents') === 'true'
  
  const { events } = await getAdminContext(request, params)
  if (!events) return { events: undefined, showAllEvents }

  // Cast to Event[] since we know the data from Supabase has event_status
  const typedEvents = events as unknown as Event[]

  const filtered = showAllEvents 
    ? typedEvents 
    : typedEvents.filter(event => 
        event.event_status !== 'Completed' && 
        event.event_status !== 'Cancelled'
      )

  const sorted = filtered.sort((a, b) => {
    const startA = a.time_event_start
    const startB = b.time_event_start
    if (!startA || !startB) {
      return -1
    }

    return new Date(startA).getTime() - new Date(startB).getTime()
  })
  return { events: sorted, showAllEvents }
}

const AdminDashboard = ({ loaderData }: Route.ComponentProps) => {
  const { events, showAllEvents } = loaderData
  const [searchParams, setSearchParams] = useSearchParams()

  const handleToggleShowAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      searchParams.set('showAllEvents', 'true')
    } else {
      searchParams.delete('showAllEvents')
    }
    setSearchParams(searchParams)
  }

  return (
    <>
      <h1>Visão geral</h1>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2>Eventos</h2>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="showAllEvents"
              checked={showAllEvents}
              onChange={handleToggleShowAll}
            />
            <label 
              htmlFor="showAllEvents" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mostrar eventos finalizados e cancelados
            </label>
          </div>
        </div>

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
