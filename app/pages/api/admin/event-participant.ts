import type { ActionFunctionArgs } from "react-router"
import {
  getAdminContext,
  updateEventParticipantById,
} from "~/business/admin/admin.server"
import { toCommitResult } from "~/lib/helpers/to-commit-result"

/**
 * A route of its own rather than the page's action: the grid edits a cell and
 * waits for a verdict, and a POST to a page route is a document submission,
 * which React Router answers with rendered HTML and a revalidation the grid
 * spent a shouldRevalidate branch turning away.
 *
 * Which participant is being written is the body's to say: the grid holds the
 * row and the url names the event, not the row.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  await getAdminContext(request, params)

  let answers: unknown
  try {
    answers = await request.json()
  } catch {
    // No question is to blame for a body the server cannot read, so the caller
    // is left to say the save failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  const result = await updateEventParticipantById(answers)

  // The browser only reads the body, but a refused save should not read as a
  // success to anything watching the status.
  return Response.json(toCommitResult(result), {
    status: result.success ? 200 : 422,
  })
}
