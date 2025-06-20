import type { FC, ReactNode } from "react"
import { redirectWithInfo } from "remix-toast"
import { getContext } from "~/business/auth/auth.server"
import { cancelApplicationToEvent } from "~/business/participant/cancel-application-to-event.server"
import { EventCard } from "~/components/organisms/event-card/event-card"
import { EventCardSkeleton } from "~/components/organisms/event-card/event-card-skeleton"
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
  const empty: {
    registrationOpen: ViewEvent[]
    scheduled: ViewEvent[]
    registrationClosed: ViewEvent[]
  } = {
    registrationOpen: [],
    scheduled: [],
    registrationClosed: [],
  }

  if (!events || events.length < 1) return empty

  return events.reduce((acc, event) => {
    if (event.event_status === "Registration Open") {
      acc.registrationOpen.push(event)
    } else if (event.event_status === "Registration Closed") {
      acc.registrationClosed.push(event)
    } else {
      acc.scheduled.push(event)
    }
    return acc
  }, empty)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getContext(request, params)

  if (!currentProfile?.basic_data_filled) {
    throw await redirectWithInfo(
      AGREE_TO_TERMS,
      "Você precisa aceitar os termos antes de continuar",
    )
  }

  const result = await getNextEvents(currentProfile.id, 12)

  if (!result.success) {
    return {
      error: result.errors,
      registrationOpen: [],
      scheduled: undefined,
      registrationClosed: undefined,
    }
  }

  return splitEvents(result.data)
}

export async function action({ request, params }: Route.ClientActionArgs) {
  return await cancelApplicationToEvent(request, params)
}

type WrapperProps = {
  openRegistrationEvents: ReactNode
  scheduledEvents: ReactNode
  closedRegistrationEvents: ReactNode
}

const Wrapper: FC<WrapperProps> = ({
  openRegistrationEvents,
  scheduledEvents,
  closedRegistrationEvents,
}) => {
  return (
    <>
      <div className="flex flex-col gap-4">
        <h2>Inscrições abertas</h2>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
          {openRegistrationEvents}
        </div>
      </div>

      {closedRegistrationEvents && (
        <div className="flex flex-col gap-4">
          <h2>Inscrições encerradas</h2>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {closedRegistrationEvents}
          </div>
        </div>
      )}

      {scheduledEvents && (
        <div className="flex flex-col gap-4">
          <h2>Eventos agendados</h2>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {scheduledEvents}
          </div>
        </div>
      )}
    </>
  )
}

export const HydrateFallback = () => {
  return (
    <Wrapper
      openRegistrationEvents={<EventCardSkeleton />}
      scheduledEvents={undefined}
      closedRegistrationEvents={undefined}
    />
  )
}

const DashboardPage = ({ loaderData }: Route.ComponentProps) => {
  const { registrationOpen, registrationClosed, scheduled } = loaderData

  return (
    <Wrapper
      openRegistrationEvents={
        registrationOpen.length ? (
          registrationOpen.map((event) => (
            <EventCard
              data-testid="event-card-open"
              key={event.id}
              event={event}
            />
          ))
        ) : (
          <p>Nenhum evento com inscrições abertas</p>
        )
      }
      closedRegistrationEvents={
        !!registrationClosed?.length &&
        registrationClosed.map((event) => (
          <EventCard
            data-testid="event-card-closed"
            key={event.id}
            event={event}
          />
        ))
      }
      scheduledEvents={
        !!scheduled?.length &&
        scheduled.map((event) => (
          <EventCard
            data-testid="event-card-scheduled"
            key={event.id}
            event={event}
          />
        ))
      }
    />
  )
}

export default DashboardPage
