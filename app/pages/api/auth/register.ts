import type { ActionFunctionArgs } from "react-router"
import { getContext, registerUser } from "~/business/auth/auth.server"
import { registerUserSchema } from "~/business/common"

/**
 * A route of its own rather than the register page's own action: a POST to a
 * page route is a document submission, and React Router answers it with
 * rendered HTML, so the CommitResult the runtime needs never survives the trip.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const context = await getContext(request, params)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    // No question is to blame for a body the server cannot read, so the runtime
    // is left to say the save failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  // The same schema the browser used. Checking it again here is what keeps a
  // bare POST from reaching the signup with anything it likes.
  const parsed = registerUserSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        errors: parsed.error.issues.map((issue) => ({
          questionId: String(issue.path[0] ?? ""),
          message: issue.message,
        })),
      },
      // The browser only reads the body, but a refused sign-up should not read
      // as a success to anything watching the status.
      { status: 422 },
    )
  }

  return Response.json(await registerUser(parsed.data, context))
}
