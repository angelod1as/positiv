import { getClientContext } from "~/business/auth/auth.client"
import { HomePageAbout } from "~/pages/homepage/components/about/about"
import { HomePageCtaBanner } from "~/pages/homepage/components/cta-banner/home-page-cta-banner"
import { HomePageFounders } from "~/pages/homepage/components/founders/home-page-founders"
import { HomePageHero } from "~/pages/homepage/components/hero/hero"
import { HomePageNextEvents } from "~/pages/homepage/components/next-events/next-events"
import { HomePageTestimonials } from "~/pages/homepage/components/testimonials/home-page-testimonials"
import type { FCC } from "~types/utils.types"
import type { Route } from "./+types/homepage"
import { HomePageNextEventsSkeleton } from "./components/next-events/next-events-skeleton"
import { getNextEvents } from "./fetch/get-next-events"

/* Needs to be clientLoader because getNextEvents needs new Date() */
export async function clientLoader({}: Route.LoaderArgs) {
  const { currentProfile, supabase } = await getClientContext()
  return await getNextEvents(supabase, currentProfile?.id, 3)
}

/* Wrapper to show Skeleton below */
const Wrapper: FCC = ({ children }) => {
  return (
    <div>
      <HomePageHero />
      {children}
      <HomePageAbout />
      <HomePageTestimonials />
      <HomePageCtaBanner />
      <HomePageFounders />
    </div>
  )
}

export function HydrateFallback() {
  return (
    <Wrapper>
      <HomePageNextEventsSkeleton />
    </Wrapper>
  )
}

export default function Homepage({ loaderData }: Route.ComponentProps) {
  const shouldShowEvents = false
  const { error, events } = loaderData
  return (
    <Wrapper>
      {!error && shouldShowEvents && <HomePageNextEvents events={events} />}
    </Wrapper>
  )
}
