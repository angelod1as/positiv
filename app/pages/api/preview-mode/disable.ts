import { disableDraftMode } from "~/business/cms/draft-mode.server"
import { safeRedirect } from "~/lib/helpers/safe-redirect"
import type { Route } from "./+types/disable"

export async function loader({ request }: Route.LoaderArgs) {
  const redirectTo = safeRedirect(
    new URL(request.url).searchParams.get("redirect"),
    "/",
  )

  return new Response(null, {
    status: 307,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await disableDraftMode(request),
    },
  })
}
