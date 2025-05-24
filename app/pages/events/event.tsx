import { redirect } from "react-router"
import paths from "~/lib/paths"
import type { Route } from "./+types/event"

const {
  dash: {
    DASHBOARD,
    events: { EVENT_RULES },
  },
} = paths

export async function loader({ params }: Route.LoaderArgs) {
  if (!params.id) return redirect(DASHBOARD)
  return redirect(EVENT_RULES(params.id))
}
