import { redirect } from "react-router"
import { env } from "~/env.server"
import paths from "~/lib/paths"

export function assertPaymentSystemOnline() {
  if (!env().paymentSystemOnline) {
    // Redirect to the dashboard rather than `/` so authenticated users
    // stay in their session context. Unauthenticated users hit the
    // dashboard's own auth guard and flow to login from there.
    throw redirect(paths.dash.DASHBOARD)
  }
}
