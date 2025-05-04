import { Outlet } from "react-router"

// TODO: Require user
// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   const { user } = await requireUser(request)
//   return { user }
// }

const AuthGuardLayout = () => {
  return <Outlet />
}

export default AuthGuardLayout
