import type { ActionFunctionArgs } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { saveBasicData } from "~/business/participant/basic-data.server"

/**
 * A route of its own rather than the page's action: a POST to a page route is a
 * document submission, and React Router answers it with rendered HTML, so the
 * CommitResult the runtime needs never survives the trip.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const context = await getUserContext(request, params)

  let answers: unknown
  try {
    answers = await request.json()
  } catch {
    // No question is to blame for a body the server cannot read, so the runtime
    // is left to say the save failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  const result = await saveBasicData({
    answers: answers as Record<string, unknown>,
    context,
  })

  // The browser only reads the body, but a refused save should not read as a
  // success to anything watching the status.
  return Response.json(result, { status: result.ok ? 200 : 422 })
}
