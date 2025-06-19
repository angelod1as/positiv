import { getClientContext } from "~/business/auth/auth.client"
import { HomePageAbout } from "~/pages/homepage/components/about/about"
import { HomePageCtaBanner } from "~/pages/homepage/components/cta-banner/home-page-cta-banner"
import { HomePageFounders } from "~/pages/homepage/components/founders/home-page-founders"
import { HomePageHero } from "~/pages/homepage/components/hero/hero"
import { HomePageNextEvents } from "~/pages/homepage/components/next-events/next-events"
import { HomePageTestimonials } from "~/pages/homepage/components/testimonials/home-page-testimonials"
import type { Route } from "./+types/homepage"
import { HomePageNextEventsSkeleton } from "./components/next-events/next-events-skeleton"
import { getNextEvents } from "./fetch/get-next-events"

/* Needs to be clientLoader because getNextEvents needs new Date() */
export async function clientLoader({}: Route.LoaderArgs) {
  const { currentUser, currentProfile, supabase } = await getClientContext()
  const isLoggedIn = !!currentUser?.id
  const { error, events } = await getNextEvents(
    supabase,
    currentProfile?.id,
    3,
    true,
  )
  if (error || !events) {
    return { events: undefined, isLoggedIn }
  }
  return { events, isLoggedIn }
}

export function HydrateFallback() {
  return (
    <div>
      <HomePageHero />
      <HomePageNextEventsSkeleton />
      <HomePageAbout />
      <HomePageTestimonials />
      <HomePageCtaBanner isLoggedIn={false} />
      <HomePageFounders />
    </div>
  )
}

export default function Homepage({ loaderData }: Route.ComponentProps) {
  const { events, isLoggedIn } = loaderData
  return (
    <div>
      <HomePageHero />
      <HomePageNextEvents events={events} />
      <HomePageAbout />
      <HomePageTestimonials />
      <HomePageCtaBanner isLoggedIn={isLoggedIn} />
      <HomePageFounders />
    </div>
  )
}
