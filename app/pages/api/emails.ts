import type { ActionFunctionArgs } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import {
  findEmailPreferences,
  saveEmailPreferences,
} from "~/business/newsletter/email-preferences.server"

/**
 * Saves the "Seus e-mails" page. The token from an email footer opens it
 * without a login; without one, it saves for the person logged in.
 *
 * A route of its own rather than the page's action: a POST to a page route is
 * answered with rendered HTML, so the CommitResult the runtime needs never
 * survives the trip.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return Response.json({ ok: false, errors: [] }, { status: 415 })
  }

  let body: { token?: unknown; answers?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  let profileId: string
  if (typeof body.token === "string" && body.token) {
    const found = await findEmailPreferences({ token: body.token })
    if (!found.success || !found.data) {
      return Response.json({ ok: false, errors: [] }, { status: 404 })
    }
    profileId = found.data.profileId
  } else {
    const { currentProfile } = await getUserContext(request, params)
    if (!currentProfile) {
      return Response.json({ ok: false, errors: [] }, { status: 404 })
    }
    profileId = currentProfile.id
  }

  const saved = await saveEmailPreferences(profileId, body.answers)
  if (!saved.success) {
    return Response.json({ ok: false, errors: [] }, { status: 422 })
  }

  return Response.json({ ok: true, bounced: saved.data.bounced })
}
