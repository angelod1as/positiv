import { getAdminContext } from "~/business/admin/admin.server"
import type { Route } from "./+types/private"

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)
}
