import type { FC } from "react"
import { Await } from "react-router"
import { Suspense } from "react"
import { redirectWithInfo } from "remix-toast"
import { trackServerEvent } from "~/lib/analytics/umami.server"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { cancelApplicationToEvent } from "~/business/participant/cancel-application-to-event.server"
import { hasEverApplied } from "~/business/participant/has-ever-applied.server"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { EventCard } from "~/components/organisms/event-card/event-card"
import { EventListSkeleton } from "~/components/organisms/event-list/event-list-skeleton"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Event } from "~types/database/entities.types"
import { getNextEvents } from "../homepage/fetch/get-next-events"
import type { Route } from "./+types/dashboard-page"
import { splitEvents } from "./utils/split-events"

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Meus Eventos")
}

const {
  dash: {
    participant: { AGREE_TO_TERMS },
  },
} = paths

// The application form asks who referred the person, and it is the one answer
// it will not take empty.
const ADMIN_APPLICATION_REFERRED = "Administração"

async function loadEvents(profileId: string) {
  const result = await getNextEvents(profileId, 12)

  if (!result.success) {
    // Throwing an error allows the <Await> component's errorElement to catch it
    throw new Error(
      result.errors.map((e) => e.message).join(", ") ||
        "Failed to load events.",
    )
  }

  return result.data
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getContext(request, params)

  if (!currentProfile?.basic_data_filled) {
    throw await redirectWithInfo(
      AGREE_TO_TERMS,
      "Você precisa aceitar os termos antes de continuar",
    )
  }

  // Start the event query before awaiting the flag, so the two run concurrently
  // rather than one after the other
  const events = loadEvents(currentProfile.id)

  // Return object with unawaited promise for streaming
  // No defer() wrapper needed in React Router 7
  return {
    events,
    hasEverApplied: await hasEverApplied(currentProfile.id),
    isAdmin: currentProfile.is_admin ?? false,
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

  if (fetchId === "handleAdminApply") {
    const context = await getUserContext(request, params)

    // The only gate this application has. Whoever is not an admin walks the
    // whole flow, quiz included, exactly as before.
    if (!context.currentProfile?.is_admin) {
      return { error: "Você não tem permissão para se candidatar diretamente" }
    }

    if (!eventId) return { error: "Evento não encontrado." }

    const result = await applyToEvent(
      {
        eventId,
        applicationDate: new Date(),
        referred: ADMIN_APPLICATION_REFERRED,
        skipEmail: true,
      },
      context,
    )

    if (!result.success) {
      return {
        error:
          result.errors[0]?.message ??
          "Sua candidatura teve um erro, tente novamente.",
      }
    }

    return
  }

  return
}

export const EventsContent: FC<{
  events: Event[]
  hasEverApplied: boolean
  isAdmin?: boolean
}> = ({ events, hasEverApplied, isAdmin }) => {
  const { applied, available } = splitEvents(events)

  return (
    <>
      {!hasEverApplied && (
        <Alert>
          <AlertTitle>Sua conta está pronta</AlertTitle>
          <AlertDescription>
            Mas ter conta não te coloca em nenhuma festa. Escolha um evento
            abaixo e envie sua candidatura.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <h2>Eventos em que você se candidatou</h2>
        {applied.length ? (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {applied.map((event) => (
              <EventCard
                data-testid="event-card-applied"
                key={event.id}
                event={event}
              />
            ))}
          </div>
        ) : (
          <p>Você não tem nenhuma candidatura no momento.</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2>Eventos da Positiv</h2>
        {available.length ? (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {available.map((event) => (
              <EventCard
                data-testid="event-card-available"
                key={event.id}
                event={event}
                directApply={isAdmin}
              />
            ))}
          </div>
        ) : (
          <p>Nenhum evento por aqui no momento.</p>
        )}
      </div>
    </>
  )
}

const DashboardPage = ({ loaderData }: Route.ComponentProps) => {
  return (
    <Suspense fallback={<EventListSkeleton />}>
      <Await resolve={loaderData.events}>
        {(events) => (
          <EventsContent
            events={events}
            hasEverApplied={loaderData.hasEverApplied}
            isAdmin={loaderData.isAdmin}
          />
        )}
      </Await>
    </Suspense>
  )
}

export default DashboardPage
