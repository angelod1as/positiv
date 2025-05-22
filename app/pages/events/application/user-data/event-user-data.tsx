import { redirect } from "react-router"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { getSession } from "~/business/session.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/event-user-data"

const {
  dash: {
    events: { EVENT_RULES },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"))
  const isRulesCorrect = session.get("rulesCorrect")
  if (!isRulesCorrect) return redirect(EVENT_RULES(params.id))
}

export async function action({ request, params }: Route.ActionArgs) {
  return await applyToEvent(request, params)
}

const EventUserInfo = () => {
  return <div>EventUserInfo</div>
}

export default EventUserInfo
