import type { FC } from "react"
import { Await } from "react-router"
import { Suspense } from "react"
import { getContext } from "~/business/auth/auth.server"
import { FloatingWhatsAppButton } from "~/components/atoms/floating-whatsapp-button/floating-whatsapp-button"
import { HomePageAbout } from "~/components/pages/homepage/about/about"
import { HomePageCtaBanner } from "~/components/pages/homepage/cta-banner/home-page-cta-banner"
import { HomePageFounders } from "~/components/pages/homepage/founders/home-page-founders"
import { HomePageHero } from "~/components/pages/homepage/hero/hero"
import { HomePageNextEvents } from "~/components/pages/homepage/next-events/next-events"
import { HomePageNextEventsSkeleton } from "~/components/pages/homepage/next-events/next-events-skeleton"
import { HomePageTestimonials } from "~/components/pages/homepage/testimonials/home-page-testimonials"
import type { ViewEvent } from "~types/database/entities.types"
import type { Route } from "./+types/homepage"
import { getNextEvents } from "./fetch/get-next-events"

async function loadEvents(profileId: string | undefined) {
  const result = await getNextEvents(profileId, 3, true)

  if (!result.success) {
    return undefined
  }

  return result.data
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { currentUser, currentProfile } = await getContext(request, params)
  const isLoggedIn = !!currentUser?.id

  // Return object with unawaited promise for streaming
  // No defer() wrapper needed in React Router 7
  return {
    events: loadEvents(currentProfile?.id),
    isLoggedIn,
  }
}

const EventsContent: FC<{ events: ViewEvent[] | undefined }> = ({ events }) => {
  if (!events || events.length === 0) {
    return null
  }

  return <HomePageNextEvents events={events} />
}

export default function Homepage({ loaderData }: Route.ComponentProps) {
  const { events, isLoggedIn } = loaderData

  return (
    <>
      <div>
        <HomePageHero />
        <Suspense fallback={<HomePageNextEventsSkeleton />}>
          <Await resolve={events}>{(resolvedEvents) => <EventsContent events={resolvedEvents} />}</Await>
        </Suspense>
        <HomePageAbout />
        <HomePageTestimonials />
        <HomePageCtaBanner isLoggedIn={isLoggedIn} />
        <HomePageFounders />
      </div>
      <FloatingWhatsAppButton />
    </>
  )
}
