import { Outlet, type LoaderFunctionArgs } from "react-router"
import { requireUser } from "~/server/guards.server"

// TODO: Require user
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user } = await requireUser(request)
  return { user }
}

const AuthGuardLayout = () => {
  return <Outlet />
}

export default AuthGuardLayout
