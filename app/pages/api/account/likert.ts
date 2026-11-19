import type { ActionFunctionArgs } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { submitLikertAnswers } from "~/business/profile/likert-answers.server"

export async function action({ request, params }: ActionFunctionArgs) {
  const { currentProfile } = await getUserContext(request, params)

  let answers: unknown
  try {
    answers = await request.json()
  } catch {
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  const result = await submitLikertAnswers({
    answers: answers as Record<string, unknown>,
    viewer: currentProfile,
  })

  return Response.json(result, { status: result.ok ? 200 : 422 })
}
