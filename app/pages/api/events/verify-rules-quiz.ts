import { redirect, type ActionFunctionArgs } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { isVeteran } from "~/business/participant/is-veteran.server"
import { rulesSessionStorage } from "~/business/session.server"
import {
  OPENING_QUESTION,
  SHORT_RUN_LENGTH,
} from "~/components/forms/custom/rules/build-rules-flow"
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

  const { currentProfile } = await getUserContext(request, params)

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

  const schemas = getRulesFormSchema()

  const given = Object.keys(schemas).filter(
    (questionId) => answers[questionId] !== undefined,
  )

  // Someone who has been to a Positiv before answers three questions instead of
  // fourteen, so the whole quiz can no longer be the measure. Which run they
  // are entitled to is recounted here rather than read off the post: otherwise
  // the short run would be a claim anyone could make, and the bypass this route
  // exists to close would come back through the same door.
  //
  // Deliberately looser than the run the browser walked: any three right
  // answers including the opening question pass, not the three that were
  // dealt. The server is never told which two the deal picked, and the gate it
  // is here to hold is "has this person been to a Positiv" — which it recounts
  // — not "did they answer the exact questions their screen showed". So a
  // veteran who tripped on both probes can still post three easy ones by hand
  // and skip the long quiz they were sent to. That is a nudge, not a lock, and
  // it is meant to be.
  const shortRun =
    given.includes(OPENING_QUESTION) &&
    given.length >= SHORT_RUN_LENGTH &&
    Boolean(
      currentProfile && (await isVeteran(currentProfile.id, params.id)),
    )

  // The same schemas the browser used. Answering in the browser is what makes
  // the quiz usable; checking again here is what makes it a gate, because a
  // bare POST used to open it without answering anything.
  const errors = (shortRun ? given : Object.keys(schemas)).flatMap(
    (questionId) => {
      const result = schemas[questionId].safeParse(answers[questionId])

      return result.success
        ? []
        : [{ questionId, message: result.error.issues[0].message }]
    },
  )

  if (errors.length > 0) return Response.json({ ok: false, errors })

  const { commitSession, getSession } = rulesSessionStorage
  const session = await getSession(request.headers.get("Cookie"))
  const passed = session.get("rulesCorrect") ?? []

  session.set(
    "rulesCorrect",
    passed.includes(params.id) ? passed : [...passed, params.id],
  )

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
