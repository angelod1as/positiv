import type { ActionFunctionArgs } from "react-router"
import { getContext } from "~/business/auth/auth.server"
import { signIn } from "~/business/auth/sign-in.server"

/**
 * A route of its own rather than the login page's action: a POST to a page
 * route is a document submission, and React Router answers it with rendered
 * HTML, so the CommitResult the runtime needs never survives the trip.
 *
 * The session cookies supabase wrote while signing in ride on this answer —
 * without them the browser would be told where to go and arrive signed out.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const context = await getContext(request, params)

  let answers: unknown
  try {
    answers = await request.json()
  } catch {
    // No question is to blame for a body the server cannot read, so the runtime
    // is left to say the sign-in failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  const result = await signIn({
    answers: answers as Record<string, unknown>,
    context,
  })

  // The browser only reads the body, but a refused sign-in should not read as
  // a success to anything watching the status.
  return Response.json(result, {
    status: result.ok ? 200 : 422,
    headers: context.supabaseHeaders,
  })
}
