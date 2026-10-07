import { validatePreviewUrl } from "@sanity/preview-url-secret"
import { ENV } from "varlock/env"
import { createDraftReadClient } from "~/business/cms/draft-read-client.server"
import { enableDraftMode } from "~/business/cms/draft-mode.server"
import type { Route } from "./+types/enable"

export async function loader({ request }: Route.LoaderArgs) {
  if (!ENV.SANITY_VIEWER_TOKEN) {
    return new Response("Draft mode is not configured", { status: 500 })
  }

  const { isValid, redirectTo = "/" } = await validatePreviewUrl(
    createDraftReadClient(),
    request.url,
  )

  if (!isValid) {
    return new Response("Invalid preview URL", { status: 401 })
  }

  return new Response(null, {
    status: 307,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await enableDraftMode(request),
    },
  })
}
