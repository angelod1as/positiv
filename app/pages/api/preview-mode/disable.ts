import { disableDraftMode } from "~/business/cms/draft-mode.server"
import type { Route } from "./+types/disable"

// Only a same-origin path is allowed back, so a crafted ?redirect= on a link
// to our domain cannot bounce a visitor off-site.
function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith("/")) return "/"
  if (target.startsWith("//") || target.startsWith("/\\")) return "/"
  return target
}

export async function loader({ request }: Route.LoaderArgs) {
  const redirectTo = safeRedirect(
    new URL(request.url).searchParams.get("redirect"),
  )

  return new Response(null, {
    status: 307,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await disableDraftMode(request),
    },
  })
}
