import { redirectWithError } from "remix-toast"
import { getUserContext } from "~/business/auth/auth.server"
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

  // A resource route requested directly does not run the private layout's
  // loader, so it signs the visitor in itself.
  await getUserContext(request, params)

  const data = await findCalendarEvent(params.eventId).catch((error) => {
    logger.error("Could not read the event for a calendar", {
      eventId: params.eventId,
      error,
    })
    return undefined
  })

  if (!data) {
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
