import { disableDraftMode } from "~/business/cms/draft-mode.server"
import type { Route } from "./+types/disable"

// Resolve the target against the request origin and keep only a same-origin
// result, so neither a protocol-relative value nor one smuggling a stripped tab
// or newline can bounce a visitor off-site.
function safeRedirect(target: string | null, requestUrl: string): string {
  if (!target) return "/"
  try {
    const base = new URL(requestUrl)
    const url = new URL(target, base)
    if (url.origin !== base.origin) return "/"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/"
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const redirectTo = safeRedirect(
    new URL(request.url).searchParams.get("redirect"),
    request.url,
  )

  return new Response(null, {
    status: 307,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await disableDraftMode(request),
    },
  })
}
