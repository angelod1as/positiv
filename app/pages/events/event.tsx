import { redirect } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { findVisibleEvent } from "~/business/event/find-visible-event.server"
import { assertUuidParams } from "~/lib/helpers/assert-uuid-params"
import paths from "~/lib/paths"
import type { Route } from "./+types/event"

const {
  dash: {
    DASHBOARD,
    events: { EVENT_RULES },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  assertUuidParams(params.id)

  if (!params.id) return redirect(DASHBOARD)

  await getUserContext(request, params)

  const event = await findVisibleEvent(params.id)

  if (!event) return redirect(DASHBOARD)

  return redirect(EVENT_RULES(params.id))
}
