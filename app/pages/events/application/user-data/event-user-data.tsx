import { applyToEvent } from "~/business/participant/apply-to-event.server"
import type { Route } from "./+types/event-user-data"

export async function action({ request, params }: Route.ActionArgs) {
  return await applyToEvent(request, params)
}

const EventUserInfo = () => {
  return <div>EventUserInfo</div>
}

export default EventUserInfo
