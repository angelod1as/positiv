import type { ActionFunctionArgs } from "react-router"
import {
  createOrUpdateEvent,
  getAdminContext,
} from "~/business/admin/admin.server"
import { toCommitResult } from "~/lib/helpers/to-commit-result"
import { zod } from "~/lib/helpers/zod"

const eventTarget = zod.object({ id: zod.string().optional() })

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
  // never asks about. Deriving it from the url instead would only say the same
  // thing twice — this route is admin-gated, and an admin may write any event.
  //
  // It is read through a schema rather than cast, because the id is the one
  // field here that no schema downstream would blame a question for: it belongs
  // to no question, so a rejection naming it would have nowhere to be drawn.
  //
  // The save is an upsert, so an id naming no event writes a new one under that
  // id rather than failing. That is what the form's hidden id field has always
  // done, and it is harmless while every writer is an admin who may write any
  // event — but it is inherited on purpose, not by accident.
  const target = eventTarget.safeParse(answers)

  if (!target.success) {
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  const result = await createOrUpdateEvent(answers, {
    ...context,
    eventId: target.data.id,
  })

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
