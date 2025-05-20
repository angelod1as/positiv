import { getUserContext } from "~/business/auth/auth.server"
import type { Route } from "./+types/private"

export async function loader({ request, params }: Route.LoaderArgs) {
  await getUserContext(request, params)
}
