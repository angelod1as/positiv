import { redirect, type ActionFunctionArgs } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { rulesSessionStorage } from "~/business/session.server"
import { buildApplicationQuestions } from "~/components/forms/custom/application/build-application-questions"
import { participantCopy } from "~/copy/participant"
import { trackServerEvent } from "~/lib/analytics/umami.server"
import paths from "~/lib/paths"

const {
  dash: { DASHBOARD },
} = paths

/**
 * A route of its own rather than the page's action, for the reason the quiz
 * check has one: a POST to a page route is a document submission, and the
 * answer comes back as HTML the runtime cannot read.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  if (!params.id) return redirect(DASHBOARD)

  const context = await getUserContext(request, params)

  // The quiz is the gate, and the loader alone never guarded it: a POST runs
  // before any loader. Whoever writes an application has passed this event's
  // quiz in this browser, or does not write one.
  const session = await rulesSessionStorage.getSession(
    request.headers.get("Cookie"),
  )

  if (!(session.get("rulesCorrect") ?? []).includes(params.id)) {
    return Response.json({ ok: false, errors: [] }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    // No question is to blame for a body the server cannot read, so the runtime
    // is left to say the save failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  // `null` is valid JSON and parses without complaint, so a body that is not a
  // set of answers has to be turned away here rather than read from.
  if (typeof body !== "object" || body === null) {
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  const answers = body as Record<string, unknown>

  const errors: { questionId: string; message: string }[] = []

  // Only what the form asked, and only as its own schema made it — `referred`
  // trims, and writing the raw answer would store the spaces around a name.
  // `applyToEventInputSchema` also accepts `skipEmail`, which belongs to the
  // admin's one-click application, so a body spread wholesale would let anyone
  // past the quiz turn off their own confirmation e-mail.
  const values: Record<string, unknown> = {}

  for (const question of buildApplicationQuestions()) {
    const result = question.schema.safeParse(answers[question.id])

    if (!result.success) {
      errors.push({
        questionId: question.id,
        message: result.error.issues[0].message,
      })
      continue
    }

    values[question.id] = result.data
  }

  if (errors.length > 0) return Response.json({ ok: false, errors })

  const result = await applyToEvent(
    { ...values, eventId: params.id, applicationDate: new Date() },
    context,
  )

  if (!result.success) {
    return Response.json({
      ok: false,
      errors: [],
      message: result.errors[0]?.message ?? participantCopy.application.failed,
    })
  }

  trackServerEvent(
    "event_application_completed",
    { eventId: params.id },
    `/events/${params.id}/apply`,
  )

  return Response.json({ ok: true, emailSent: result.data.emailSent })
}
