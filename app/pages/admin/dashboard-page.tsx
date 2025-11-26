import { Separator } from "~/components/ui/separator"
import { AdminDashboardEventsTable } from "~/components/organisms/tables/admin/events-table"
import { useAdminEvents } from "~/lib/hooks/use-admin-events"

export async function loader() {
  return null
}

const AdminDashboard = () => {
  const { data: events, isLoading, isError, error } = useAdminEvents()

  return (
    <>
      <h1>Visão geral</h1>
      <div>
        <h2>Eventos</h2>

        {isLoading && <p>Carregando eventos...</p>}

        {isError && (
          <p className="text-red-500">
            {error instanceof Error ? error.message : "Erro ao carregar eventos"}
          </p>
        )}

        {events && events.length > 0 ? (
          <AdminDashboardEventsTable events={events} />
        ) : (
          !isLoading && "Nenhum evento encontrado"
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
