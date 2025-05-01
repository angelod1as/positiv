import { Outlet, type LoaderFunctionArgs } from "react-router"
import { requireUser } from "~/server/guards.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user } = await requireUser(request)
  return { user }
}

const Layout = () => {
  return (
    <div>
      <Outlet />
    </div>
  )
}

export default Layout
