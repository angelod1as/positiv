import type { ActionFunctionArgs } from "react-router"
import {
  createOrUpdateEvent,
  getAdminContext,
} from "~/business/admin/admin.server"
import { toCommitResult } from "~/lib/helpers/to-commit-result"

/**
 * A route of its own rather than the page's action: a POST to a page route is a
 * document submission, and React Router answers it with rendered HTML, so the
 * CommitResult the runtime needs never survives the trip.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const context = await getAdminContext(request, params)

  let answers: unknown
  try {
    answers = await request.json()
  } catch {
    // No question is to blame for a body the server cannot read, so the runtime
    // is left to say the save failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  // Which event is being written is the body's to say: the form is the same one
  // whether it is creating or correcting, and the page holds the id the run
  // never asks about.
  const { id } = answers as { id?: string }

  const result = await createOrUpdateEvent(answers, { ...context, eventId: id })

  if (!result.success) {
    // The browser only reads the body, but a refused save should not read as a
    // success to anything watching the status.
    return Response.json(toCommitResult(result), { status: 422 })
  }

  // The id rides alongside the verdict rather than inside it: a CommitResult
  // carries no payload, and the page needs somewhere to send whoever just
  // created an event.
  return Response.json({ ok: true, id: result.data })
}
