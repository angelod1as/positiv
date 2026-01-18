import type { FC, ReactNode } from "react"
import { Await } from "react-router"
import { Suspense } from "react"
import { redirectWithInfo } from "remix-toast"
import { trackServerEvent } from "~/lib/analytics/umami.server"
import { getContext } from "~/business/auth/auth.server"
import { cancelApplicationToEvent } from "~/business/participant/cancel-application-to-event.server"
import { EventCard } from "~/components/organisms/event-card/event-card"
import { EventListSkeleton } from "~/components/organisms/event-list/event-list-skeleton"
import paths from "~/lib/paths"
import type { ViewEvent } from "~types/database/entities.types"
import { getNextEvents } from "../homepage/fetch/get-next-events"
import type { Route } from "./+types/dashboard-page"
import { splitEvents } from "./utils/split-events"

const {
  dash: {
    participant: { AGREE_TO_TERMS },
  },
} = paths

async function loadEvents(profileId: string) {
  const result = await getNextEvents(profileId, 12)

  if (!result.success) {
    // Throwing an error allows the <Await> component's errorElement to catch it
    throw new Error(
      result.errors.map((e) => e.message).join(", ") ||
        "Failed to load events.",
    )
  }

  return splitEvents(result.data)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getContext(request, params)

  if (!currentProfile?.basic_data_filled) {
    throw await redirectWithInfo(
      AGREE_TO_TERMS,
      "Você precisa aceitar os termos antes de continuar",
    )
  }

  // Return object with unawaited promise for streaming
  // No defer() wrapper needed in React Router 7
  return {
    events: loadEvents(currentProfile.id),
  }
}

export async function action({ request, params }: Route.ClientActionArgs) {
  const formData = await request.clone().formData()
  const fetchId = formData.get("fetchId")?.toString()
  const eventId = formData.get("eventId")?.toString()

  if (fetchId === "handleConfirmCancel") {
    const { currentProfile } = await getContext(request, params)

    const result = await cancelApplicationToEvent({
      eventId,
      profileId: currentProfile?.id,
    })

    if (!result.success) {
      // TODO: POS-143 Fix "DataWithError". There MUST be a way!!! (Or return "toast" here)
      throw new Error(
        "Ops, seu cancelamento deu errado. Comunique o administrador.",
      )
    }

    trackServerEvent("event_cancel_completed", { eventId }, "/dashboard")

    return
  }

  return
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

const EventsContent: FC<{
  events: {
    registrationOpen: ViewEvent[]
    registrationClosed: ViewEvent[]
    scheduled: ViewEvent[]
  }
}> = ({ events }) => {
  const { registrationOpen, registrationClosed, scheduled } = events

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

const DashboardPage = ({ loaderData }: Route.ComponentProps) => {
  return (
    <Suspense fallback={<EventListSkeleton />}>
      <Await resolve={loaderData.events}>
        {(events) => <EventsContent events={events} />}
      </Await>
    </Suspense>
  )
}

export default DashboardPage
