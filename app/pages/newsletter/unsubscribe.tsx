import { redirect } from "react-router"
import paths from "~/lib/paths"
import type { Route } from "./+types/unsubscribe"

const {
  root: { EMAILS },
} = paths

/**
 * The footer link of emails sent before WEB-53. It carried the bare profile
 * id, which opened an unsubscribe for whoever held it; the id is dropped, so
 * it opens nothing, and the person lands on Seus e-mails, which asks for a
 * login. The UTMs ride along so the visit is still attributed to the email.
 */
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const utm = new URLSearchParams(
    [...url.searchParams].filter(([key]) => key.startsWith("utm_")),
  )
  const query = utm.toString()

  return redirect(query ? `${EMAILS}?${query}` : EMAILS)
}
