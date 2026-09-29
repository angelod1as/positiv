import type { FC } from "react"
import { Await } from "react-router"
import { Suspense } from "react"
import { getContext } from "~/business/auth/auth.server"
import { homepageContentCache } from "~/business/cms/homepage-content-cache.server"
import { FloatingWhatsAppButton } from "~/components/atoms/floating-whatsapp-button/floating-whatsapp-button"
import { HomePageAbout } from "~/components/pages/homepage/about/about"
import { HomePageCtaBanner } from "~/components/pages/homepage/cta-banner/home-page-cta-banner"
import { HomePageFeedback } from "~/components/pages/homepage/feedback/home-page-feedback"
import { HomePageFounders } from "~/components/pages/homepage/founders/home-page-founders"
import { HomePageHero } from "~/components/pages/homepage/hero/hero"
import { HomePageNextEvents } from "~/components/pages/homepage/next-events/next-events"
import { HomePageNextEventsSkeleton } from "~/components/pages/homepage/next-events/next-events-skeleton"
import { HomePageTestimonials } from "~/components/pages/homepage/testimonials/home-page-testimonials"
import { createMetaArray } from "~/lib/helpers/meta"
import { logger } from "~/lib/logger/logger.server"
import type { Event } from "~types/database/entities.types"
import type { Route } from "./+types/homepage"
import { getNextEvents } from "./fetch/get-next-events"

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Positiv Party")
}

async function loadEvents(profileId: string | undefined, count: number) {
  const result = await getNextEvents(profileId, count, true)

  if (!result.success) {
    return undefined
  }

  return result.data
}

async function loadContent() {
  try {
    return await homepageContentCache.get()
  } catch (error) {
    logger.error("Could not load the homepage content", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Response(null, { status: 503 })
  }
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { currentUser, currentProfile } = await getContext(request, params)
  const isLoggedIn = !!currentUser?.id
  const content = await loadContent()

  // Return object with unawaited promise for streaming
  // No defer() wrapper needed in React Router 7
  return {
    content,
    events: loadEvents(currentProfile?.id, content.nextEvents.count),
    isLoggedIn,
  }
}

const EventsContent: FC<{ events: Event[] | undefined }> = ({ events }) => {
  if (!events || events.length === 0) {
    return null
  }

  return <HomePageNextEvents events={events} />
}

export default function Homepage({ loaderData }: Route.ComponentProps) {
  const { content, events, isLoggedIn } = loaderData

  return (
    <>
      <div>
        <HomePageHero content={content.hero} />
        <Suspense fallback={<HomePageNextEventsSkeleton />}>
          <Await resolve={events}>{(resolvedEvents) => <EventsContent events={resolvedEvents} />}</Await>
        </Suspense>
        <HomePageAbout content={content.about} />
        <HomePageTestimonials />
        <HomePageCtaBanner isLoggedIn={isLoggedIn} />
        <HomePageFounders />
        <HomePageFeedback />
      </div>
      <FloatingWhatsAppButton />
    </>
  )
}
