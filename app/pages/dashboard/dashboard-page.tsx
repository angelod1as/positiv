import { redirect } from "react-router"
import { getClientContext, getContext } from "~/business/auth.server"
import { EventCard } from "~/components/organisms/event-card/event-card"
import paths from "~/lib/paths"
import type { ViewEvent } from "~types/entities.types"
import { getNextEvents } from "../homepage/fetch/get-next-events"
import type { Route } from "./+types/dashboard-page"

const {
  dash: {
    participant: { AGREE_TO_TERMS },
  },
} = paths

const splitEvents = (events: ViewEvent[] | undefined) => {
  const empty: { registrationOpen: ViewEvent[]; scheduled: ViewEvent[] } = {
    registrationOpen: [],
    scheduled: [],
  }

  if (!events || events.length < 1) return empty

  return events.reduce((acc, event) => {
    if (event.event_status === "Registration Open") {
      acc.registrationOpen.push(event)
    } else {
      acc.scheduled.push(event)
    }
    return acc
  }, empty)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile, supabaseHeaders } = await getContext(request, params)

  if (!currentProfile?.basic_data_filled) {
    return redirect(AGREE_TO_TERMS, { headers: supabaseHeaders })
  }
}

/* Needs to be clientLoader because getNextEvents needs new Date() */
export async function clientLoader({}: Route.LoaderArgs) {
  const { supabase, currentProfile } = await getClientContext()
  const { events, error } = await getNextEvents(supabase, currentProfile)

  if (error || !events) {
    return {
      registrationOpen: [],
      scheduled: [],
    }
  }

  return splitEvents(events)
}

// TODO: HydrateFallback

const DashboardPage = ({ loaderData }: Route.ComponentProps) => {
  const { registrationOpen, scheduled } = loaderData

  return (
    <div className="px-4 lg:px-8 pb-4 flex flex-col gap-12 ... mb-12 py-8">
      <div className="flex flex-col gap-4">
        <h2>Inscrições abertas</h2>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
          {registrationOpen.length ? (
            registrationOpen.map((event) => (
              <EventCard
                data-testid="event-card-open"
                key={event.id}
                event={event}
              />
            ))
          ) : (
            <p>Nenhum evento com inscrições abertas</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2>Eventos agendados</h2>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
          {scheduled.length ? (
            scheduled.map((event) => (
              <EventCard
                data-testid="event-card-scheduled"
                key={event.id}
                event={event}
              />
            ))
          ) : (
            <p>Nenhum evento encontrado</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
