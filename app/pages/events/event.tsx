import { redirect } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { kyselyDb } from "~/kysely-db"
import paths from "~/lib/paths"
import type { Route } from "./+types/event"

const {
  dash: {
    DASHBOARD,
    events: { EVENT_RULES },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) return redirect(DASHBOARD)

  await getUserContext(request, params)

  const event = await kyselyDb
    .selectFrom("events")
    .select("id")
    .where("id", "=", params.id)
    .where("event_status", "!=", "Draft")
    .executeTakeFirst()

  if (!event) return redirect(DASHBOARD)

  return redirect(EVENT_RULES(params.id))
}
