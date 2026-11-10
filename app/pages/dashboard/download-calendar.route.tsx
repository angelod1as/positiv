import { redirectWithError } from "remix-toast"
import { getContext } from "~/business/auth/auth.server"
import { findCalendarEvent } from "~/business/event/event.server"
import { formatCalendarEvent } from "~/business/event/format-calendar-event.server"
import { dashboardCopy } from "~/copy/dashboard"
import { logger } from "~/lib/logger/logger.server"
import { assertUuidParams } from "~/lib/helpers/assert-uuid-params"
import paths from "~/lib/paths"
import type { Route } from "./+types/download-calendar.route"

const {
  dash: { DASHBOARD },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  assertUuidParams(params.eventId)

  const { supabase } = await getContext(request, params)
  const { data, error } = await findCalendarEvent(supabase, params.eventId)

  if (error || !data) {
    throw await redirectWithError(DASHBOARD, dashboardCopy.calendarFailed)
  }

  const calendar = await formatCalendarEvent({
    ...data,
    event_status: data.event_status,
  })

  if (!calendar) {
    logger.warn("Event is missing the fields a calendar needs", {
      eventId: params.eventId,
    })
    throw await redirectWithError(DASHBOARD, dashboardCopy.calendarFailed)
  }

  return new Response(calendar.toString(), {
    status: 200,
    headers: {
      "Content-Disposition": 'attachment; filename="calendar.ics"',
      "Content-Type": "text/calendar; charset=utf-8",
    },
  })
}
