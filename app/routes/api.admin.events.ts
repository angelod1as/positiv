import type { LoaderFunctionArgs } from "react-router"
import { getAdminContext } from "~/business/admin/admin.server"
import { getEventsForDashboard } from "~/business/admin/admin.server"

export async function loader({ request, params }: LoaderFunctionArgs) {
  const context = await getAdminContext(request, params)

  if (!context.currentProfile?.is_admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const events = await getEventsForDashboard()

  return Response.json({ events })
}
