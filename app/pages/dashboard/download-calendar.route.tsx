import { redirectWithError } from "remix-toast"
import { getContext } from "~/business/auth/auth.server"
import { formatCalendarEvent } from "~/business/participant/format-calendar-event.server"
import paths from "~/lib/paths"
import type { EventStatus } from "~types/entities.types"
import type { Route } from "./+types/download-calendar.route"

const {
  dash: { DASHBOARD },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = await getContext(request, params)
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.eventId)
    .single()

  if (error || !data) {
    throw await redirectWithError(
      DASHBOARD,
      "Erro ao gerar evento no calendário, tente novamente mais tarde",
    )
  }

  const calendar = await formatCalendarEvent({
    ...data,
    event_status: data.event_status as EventStatus,
  })

  if (!calendar) {
    console.error("ERROR??")
    return
  }

  return new Response(calendar.toString(), {
    status: 200,
    headers: {
      "Content-Disposition": 'attachment; filename="calendar.ics"',
      "Content-Type": "text/calendar; charset=utf-8",
    },
  })
}
