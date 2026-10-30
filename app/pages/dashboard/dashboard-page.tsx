import type { FC } from "react"
import { Await } from "react-router"
import { Suspense } from "react"
import { redirectWithInfo } from "remix-toast"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { can, PERMISSIONS } from "~/business/auth/permissions"
import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { cancelApplicationToEvent } from "~/business/participant/cancel-application-to-event.server"
import { hasEverApplied } from "~/business/participant/has-ever-applied.server"
import { isCardPaymentsEnabled } from "~/business/settings/app-settings.server"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { EventCard } from "~/components/organisms/event-card/event-card"
import { EventListSkeleton } from "~/components/organisms/event-list/event-list-skeleton"
import { dashboardCopy } from "~/copy/dashboard"
import { eventListCopy } from "~/copy/events"
import { metaCopy } from "~/copy/meta"
import { trackEvent } from "~/lib/analytics/umami"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Event } from "~types/database/entities.types"
import { getNextEvents } from "../page/fetch/get-next-events"
import type { Route } from "./+types/dashboard-page"
import { splitEvents } from "./utils/split-events"

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.dashboard.title)
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
        dashboardCopy.loadFailed,
    )
  }

  return result.data
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getContext(request, params)

  if (!currentProfile?.basic_data_filled) {
    throw await redirectWithInfo(AGREE_TO_TERMS, dashboardCopy.termsRequired)
  }

  // Start the event query before awaiting the flag, so the two run concurrently
  // rather than one after the other
  const events = loadEvents(currentProfile.id)

  const [everApplied, cardPaymentsEnabled] = await Promise.all([
    hasEverApplied(currentProfile.id),
    isCardPaymentsEnabled(),
  ])

  // Return object with unawaited promise for streaming
  // No defer() wrapper needed in React Router 7
  return {
    events,
    hasEverApplied: everApplied,
    canApplyDirectly: can(currentProfile, PERMISSIONS.EVENTS_APPLY_DIRECT),
    appliesAsStaff: can(currentProfile, PERMISSIONS.EVENTS_APPLY_AS_STAFF),
    cardPaymentsEnabled,
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
      reason: formData.get("reason")?.toString(),
    })

    if (!result.success) {
      // TODO: WEB-24 Fix "DataWithError". There MUST be a way!!! (Or return "toast" here)
      throw new Error(dashboardCopy.cancelFailed)
    }

    return { ok: true }
  }

  if (fetchId === "handleAdminApply") {
    const context = await getUserContext(request, params)

    // The only gate this application has. Whoever lacks the permission walks
    // the whole flow, quiz included, exactly as before.
    if (!can(context.currentProfile, PERMISSIONS.EVENTS_APPLY_DIRECT)) {
      return { error: dashboardCopy.directApply.notAllowed }
    }

    if (!eventId) return { error: dashboardCopy.directApply.eventNotFound }

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
        error: result.errors[0]?.message ?? dashboardCopy.directApply.failed,
      }
    }

    return { ok: true }
  }

  return
}

// The completions are reported from here because the browser is the one
// visitor Umami should see, and the card that asked is gone by the time the
// answer lands: the revalidated event moves to the other list.
export async function clientAction({
  request,
  serverAction,
}: Route.ClientActionArgs) {
  const formData = await request.clone().formData()
  const fetchId = formData.get("fetchId")?.toString()
  const eventId = formData.get("eventId")?.toString()

  const result = await serverAction()

  if (result && "ok" in result && eventId) {
    if (fetchId === "handleConfirmCancel") {
      trackEvent("cancellation_completed", { eventId })
    }
    if (fetchId === "handleAdminApply") {
      trackEvent("direct_application_completed", { eventId })
    }
  }

  return result
}

export const EventsContent: FC<{
  events: Event[]
  hasEverApplied: boolean
  canApplyDirectly?: boolean
  appliesAsStaff?: boolean
  cardPaymentsEnabled?: boolean
}> = ({
  events,
  hasEverApplied,
  canApplyDirectly,
  appliesAsStaff,
  cardPaymentsEnabled,
}) => {
  const { applied, available } = splitEvents(events)

  return (
    <>
      {!hasEverApplied && (
        <Alert>
          <AlertTitle>{dashboardCopy.welcome.title}</AlertTitle>
          <AlertDescription>{dashboardCopy.welcome.body}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <h2>{eventListCopy.appliedHeading}</h2>
        {applied.length ? (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {applied.map((event) => (
              <EventCard
                data-testid="event-card-applied"
                key={event.id}
                event={event}
                cardPaymentsEnabled={cardPaymentsEnabled}
              />
            ))}
          </div>
        ) : (
          <p>{dashboardCopy.emptyApplied}</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2>{eventListCopy.availableHeading}</h2>
        {available.length ? (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {available.map((event) => (
              <EventCard
                data-testid="event-card-available"
                key={event.id}
                event={event}
                directApply={canApplyDirectly}
                appliesAsStaff={appliesAsStaff}
                cardPaymentsEnabled={cardPaymentsEnabled}
              />
            ))}
          </div>
        ) : (
          <p>{dashboardCopy.emptyAvailable}</p>
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
            canApplyDirectly={loaderData.canApplyDirectly}
            appliesAsStaff={loaderData.appliesAsStaff}
            cardPaymentsEnabled={loaderData.cardPaymentsEnabled}
          />
        )}
      </Await>
    </Suspense>
  )
}

export default DashboardPage
