import { createClient } from "~/lib/supabase/client"
import { HomePageAbout } from "~/pages/homepage/components/about/about"
import { HomePageCtaBanner } from "~/pages/homepage/components/cta-banner/home-page-cta-banner"
import { HomePageFounders } from "~/pages/homepage/components/founders/home-page-founders"
import { HomePageHero } from "~/pages/homepage/components/hero/hero"
import { HomePageNextEvents } from "~/pages/homepage/components/next-events/next-events"
import { HomePageTestimonials } from "~/pages/homepage/components/testimonials/home-page-testimonials"
import { getHomepageNextEvents } from "~/pages/homepage/fetch/get-homepage-next-events"
import type { FCC } from "~types/utils.types"
import type { Route } from "./+types/homepage"
import { HomePageNextEventsSkeleton } from "./components/next-events/next-events-skeleton"

// TODO: Meta
export function meta() {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ]
}

/* Needs to be clientLoader because getHomepageNextEvents needs new Date() */
export async function clientLoader({}: Route.LoaderArgs) {
  const { supabase } = createClient()
  return await getHomepageNextEvents(supabase)
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
  const { error, events } = loaderData
  return <Wrapper>{!error && <HomePageNextEvents events={events} />}</Wrapper>
}
