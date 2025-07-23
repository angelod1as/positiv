import { redirect } from "react-router"
import { redirectWithError } from "remix-toast"
import { rulesSessionStorage } from "~/business/session.server"
import paths from "~/lib/paths"
import { EventBdsmConsentPage } from "./event-bdsm-consent"

const {
  dash: {
    events: { EVENT_RULES, EVENT_BDSM_CONSENT },
  },
} = paths

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const { commitSession, getSession } = rulesSessionStorage
  try {
    const session = await getSession(request.headers.get("Cookie"))
    session.set("rulesCorrect", true)
    return redirect(EVENT_RULES(params.id), {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    })
  } catch (error) {
    console.error("event-bdsm-consent-page action", error)
    return redirectWithError(
      EVENT_BDSM_CONSENT(params.id),
      "Houve um erro no sistema, tente novamente mais tarde",
    )
  }
}

export default EventBdsmConsentPage