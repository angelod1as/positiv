import { Outlet } from "react-router"
import { redirectWithError } from "remix-toast"
import { getUserContext } from "~/business/auth/auth.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/layout"

const {
  root: { HOME },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)
  if (!currentProfile?.is_admin) {
    return redirectWithError(
      HOME,
      "Você precisa ser administradore para visitar essa página",
    )
  }
}

const AdminLayout = () => {
  return (
    <div className="px-4 lg:px-8 pb-4 flex flex-col gap-12 mb-12 py-8">
      <Outlet />
    </div>
  )
}

export default AdminLayout
