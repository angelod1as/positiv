import { EventCard } from "~/components/organisms/event-card/event-card"
// import paths from "~/lib/paths"
import { createClient as createBrowserClient } from "~/lib/supabase/client"
import type { ViewEvent } from "~types/entities.types"
import { getNextEvents } from "../homepage/fetch/get-next-events"
import type { Route } from "./+types/dashboard-page"

// const {
//   dash: {
//     participant: { AGREE_TO_TERMS },
//     admin: { ADMIN_DASHBOARD },
//   },
// } = paths

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

export async function loader({}: Route.LoaderArgs) {
  // const { supabase } = createClient(request)
  // TODO: Allow this loader to run after Auth is done
  // const profile = await getCurrentProfile(supabase)
  // if (!profile?.basic_data_filled) {
  //   return redirect(AGREE_TO_TERMS)
  // }
}

/* Needs to be clientLoader because getNextEvents needs new Date() */
export async function clientLoader({}: Route.LoaderArgs) {
  const { supabase } = createBrowserClient()
  const { events, error } = await getNextEvents(supabase)

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
