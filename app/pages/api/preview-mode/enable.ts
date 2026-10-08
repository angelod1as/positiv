import { validatePreviewUrl } from "@sanity/preview-url-secret"
import { urlSearchParamPreviewSecret } from "@sanity/preview-url-secret/constants"
import { ENV } from "varlock/env"
import { createDraftReadClient } from "~/business/cms/draft-read-client.server"
import { enableDraftMode } from "~/business/cms/draft-mode.server"
import { safeRedirect } from "~/lib/helpers/safe-redirect"
import type { Route } from "./+types/enable"

export async function loader({ request }: Route.LoaderArgs) {
  // Both are checked before validatePreviewUrl, which consumes the one-time
  // secret, so a misconfigured server does not burn the editor's handshake.
  if (!ENV.SANITY_VIEWER_TOKEN || !ENV.COOKIE_SECRET) {
    return new Response("Draft mode is not configured", { status: 500 })
  }

  // No secret means this is not a handshake from the Presentation tool; reject
  // it before spending a tokened Sanity request on validation.
  if (!new URL(request.url).searchParams.has(urlSearchParamPreviewSecret)) {
    return new Response("Missing preview secret", { status: 401 })
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
      Location: safeRedirect(redirectTo, "/"),
      "Set-Cookie": await enableDraftMode(request),
    },
  })
}
