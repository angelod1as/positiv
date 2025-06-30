import type { FC, ReactNode } from "react"
import { redirectWithInfo } from "remix-toast"
import { getContext } from "~/business/auth/auth.server"
import { cancelApplicationToEvent } from "~/business/participant/cancel-application-to-event.server"
import {
  addUserToReminderList,
  removeUserFromReminderList,
} from "~/business/participant/manage-reminder-list"
import { EventCard } from "~/components/organisms/event-card/event-card"
import { checkEventStatus } from "~/lib/helpers/check-event-status"
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
    const { isOpen, isClosed } = checkEventStatus(event.event_status)
    if (isOpen) {
      acc.registrationOpen.push(event)
    } else if (isClosed) {
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

    return
  }

  if (fetchId === "handleAddReminder") {
    const result = await addUserToReminderList(request, params)
    if (!result.success) {
      console.error(result.errors)
      return {
        error:
          "Um erro ocorreu ao adicionar o seu lembrete, contate o administrador.",
      }
    }
    return
  }

  if (fetchId === "handleRemoveReminder") {
    const result = await removeUserFromReminderList(request, params)
    if (!result.success) {
      return {
        error:
          "Um erro ocorreu ao remover o seu lembrete, contate o administrador.",
      }
    }
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
