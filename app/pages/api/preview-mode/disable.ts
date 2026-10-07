import { disableDraftMode } from "~/business/cms/draft-mode.server"
import type { Route } from "./+types/disable"

export async function loader({ request }: Route.LoaderArgs) {
  const redirectTo =
    new URL(request.url).searchParams.get("redirect") || "/"

  return new Response(null, {
    status: 307,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await disableDraftMode(request),
    },
  })
}
