import { redirect, type ActionFunctionArgs } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { rulesSessionStorage } from "~/business/session.server"
import { getRulesFormSchema } from "~/components/forms/custom/rules/rules-form-schema"
import { kyselyDb } from "~/kysely-db"
import { trackServerEvent } from "~/lib/analytics/umami.server"
import paths from "~/lib/paths"

const {
  dash: { DASHBOARD },
} = paths

/**
 * A route of its own rather than the quiz page's own action: a POST to a page
 * route is a document submission, and React Router answers it with rendered
 * HTML, so the answers the runtime needs back never survive the trip.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  if (!params.id) return redirect(DASHBOARD)

  await getUserContext(request, params)

  const event = await kyselyDb
    .selectFrom("events")
    .select("id")
    .where("id", "=", params.id)
    .executeTakeFirst()

  if (!event) return redirect(DASHBOARD)

  let answers: Record<string, unknown>
  try {
    answers = (await request.json()) as Record<string, unknown>
  } catch {
    // No question is to blame for a body the server cannot read, so the runtime
    // is left to say the save failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  // The same schemas the browser used. Answering in the browser is what makes
  // the quiz usable; checking again here is what makes it a gate, because a
  // bare POST used to open it without answering anything.
  const errors = Object.entries(getRulesFormSchema()).flatMap(
    ([questionId, schema]) => {
      const result = schema.safeParse(answers[questionId])

      return result.success
        ? []
        : [{ questionId, message: result.error.issues[0].message }]
    },
  )

  if (errors.length > 0) return Response.json({ ok: false, errors })

  const { commitSession, getSession } = rulesSessionStorage
  const session = await getSession(request.headers.get("Cookie"))
  session.set("rulesCorrect", true)

  trackServerEvent(
    "rules_quiz_passed",
    { eventId: params.id },
    `/events/${params.id}/rules`,
  )

  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": await commitSession(session) } },
  )
}
