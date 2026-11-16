import { Outlet } from "react-router"
import { getAdminContext } from "~/business/auth/admin-context.server"
import type { Route } from "./+types/private"

export async function loader({ request, params }: Route.LoaderArgs) {
  await getAdminContext(request, params)
}

export default function AdminGuard() {
  return (
    <div data-umami-block className="contents">
      <Outlet />
    </div>
  )
}
