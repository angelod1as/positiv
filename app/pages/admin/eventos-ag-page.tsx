import { getEventsForDashboard } from "~/business/admin/admin.server"
import { AdminDashboardEventsTableAG } from "~/components/organisms/tables/admin/events-table-ag"
import type { Route } from "./+types/eventos-ag-page"

export async function loader() {
  const events = await getEventsForDashboard()
  return { events }
}

const EventosAgPage = ({ loaderData }: Route.ComponentProps) => {
  const { events } = loaderData

  return (
    <div className="container mx-auto py-6">
      <div className="mb-4 rounded-lg border border-yellow-500 bg-yellow-50 p-4 text-yellow-800">
        <p className="font-semibold">POC: AG Grid Events Table</p>
        <p className="text-sm">
          This is a proof of concept for testing the AG Grid migration.
          Compare with the PrimeReact version at{" "}
          <a href="/admin" className="underline">
            /admin
          </a>
        </p>
      </div>

      <AdminDashboardEventsTableAG events={events} />
    </div>
  )
}

export default EventosAgPage
