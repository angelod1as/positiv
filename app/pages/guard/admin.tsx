import { getAdminContext } from "~/business/auth/admin-context.server"
import type { Route } from "./+types/private"

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)
}
