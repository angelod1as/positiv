import type { ActionFunctionArgs } from "react-router"
import { getAdminContext } from "~/business/admin/admin.server"
import { updateFeedbackStatus } from "~/business/feedback/feedback.server"
import { toCommitResult } from "~/lib/helpers/to-commit-result"

/**
 * A route of its own rather than the page's action: the grid edits a cell and
 * waits for a verdict, and a POST to a page route is a document submission,
 * which React Router answers with rendered HTML.
 *
 * The admin guard is a layout loader, and loaders do not run before an action,
 * so the check happens here.
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

  const result = await updateFeedbackStatus(answers)

  // The browser only reads the body, but a refused save should not read as a
  // success to anything watching the status.
  return Response.json(toCommitResult(result), {
    status: result.success ? 200 : 422,
  })
}
