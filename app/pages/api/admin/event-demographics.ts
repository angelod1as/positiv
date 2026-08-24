import type { ActionFunctionArgs } from "react-router"
import {
  getAdminContext,
  updateEventDemographics,
} from "~/business/admin/admin.server"
import { toCommitResult } from "~/lib/helpers/to-commit-result"

/**
 * A route of its own rather than the page's action: the button asks for a
 * count and waits for a verdict, and a POST to a page route is a document
 * submission, which React Router answers with rendered HTML.
 *
 * Nothing is being written but the event, which the url names — the count is
 * read from the database, so the body has nothing to say.
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
    // No question is to blame for a body the server cannot read, so the caller
    // is left to say the save failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  const result = await updateEventDemographics(answers, { ...context, eventId })

  // The browser only reads the body, but a refused count should not read as a
  // success to anything watching the status.
  return Response.json(toCommitResult(result), {
    status: result.success ? 200 : 422,
  })
}
