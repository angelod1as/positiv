import { redirect } from "react-router"
import { getContext } from "~/business/auth/auth.server"
import paths from "~/lib/paths"
import type { Route } from "./+types/event"

const {
  dash: {
    DASHBOARD,
    events: { EVENT_RULES, EVENT_BDSM_CONSENT },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) return redirect(DASHBOARD)
  
  const { supabase } = await getContext(request, params)
  
  const { data: event } = await supabase
    .from("events")
    .select("event_type")
    .eq("id", params.id)
    .single()
  
  if (!event) return redirect(DASHBOARD)
  
  // Redirect to BDSM consent page for BDSM events, otherwise to rules
  if (event.event_type === "bdsm") {
    return redirect(EVENT_BDSM_CONSENT(params.id))
  }
  
  return redirect(EVENT_RULES(params.id))
}
