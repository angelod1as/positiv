import { redirect } from "react-router"
import paths from "~/lib/paths"

const {
  admin: { ADMIN_DASHBOARD },
} = paths
export async function loader() {
  return redirect(ADMIN_DASHBOARD)
}
