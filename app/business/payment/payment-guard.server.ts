import { redirect } from "react-router"
import { env } from "~/env.server"
import paths from "~/lib/paths"

export function assertPaymentSystemOnline() {
  if (!env().paymentSystemOnline) {
    throw redirect(paths.root.HOME)
  }
}
