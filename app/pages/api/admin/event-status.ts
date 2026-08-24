import type { ActionFunctionArgs } from "react-router"
import {
  getAdminContext,
  updateEventStatus,
} from "~/business/admin/admin.server"
import { toCommitResult } from "~/lib/helpers/to-commit-result"

/**
 * A route of its own rather than the page's action: a POST to a page route is a
 * document submission, and React Router answers it with rendered HTML, so the
 * CommitResult the runtime needs never survives the trip.
 *
 * It also takes the status form off the fetcher the whole page shares with
 * participant edits, demographics and the newsletter sync, which had to be told
 * apart by an intent travelling in the form data.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const context = await getAdminContext(request, params)

  const eventId = params.id
  if (!eventId) {
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  let answers: unknown
  try {
    answers = await request.json()
  } catch {
    // No question is to blame for a body the server cannot read, so the runtime
    // is left to say the save failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  const result = await updateEventStatus(answers, { ...context, eventId })

  // The browser only reads the body, but a refused save should not read as a
  // success to anything watching the status.
  return Response.json(toCommitResult(result), {
    status: result.success ? 200 : 422,
  })
}
