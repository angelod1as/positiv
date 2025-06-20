import { getContext } from "~/business/auth/auth.server"
import { HomePageAbout } from "~/pages/homepage/components/about/about"
import { HomePageCtaBanner } from "~/pages/homepage/components/cta-banner/home-page-cta-banner"
import { HomePageFounders } from "~/pages/homepage/components/founders/home-page-founders"
import { HomePageHero } from "~/pages/homepage/components/hero/hero"
import { HomePageNextEvents } from "~/pages/homepage/components/next-events/next-events"
import { HomePageTestimonials } from "~/pages/homepage/components/testimonials/home-page-testimonials"
import type { Route } from "./+types/homepage"
import { getNextEvents } from "./fetch/get-next-events"

export async function loader({ params, request }: Route.LoaderArgs) {
  const { currentUser, currentProfile } = await getContext(request, params)
  const isLoggedIn = !!currentUser?.id
  const result = await getNextEvents(currentProfile?.id, 3, true)

  if (!result.success) {
    return { events: undefined, isLoggedIn }
  }

  return { events: result.data, isLoggedIn }
}

export default function Homepage({ loaderData }: Route.ComponentProps) {
  const { events, isLoggedIn } = loaderData

  return (
    <div>
      <HomePageHero />
      {events && events?.length > 0 ? (
        <HomePageNextEvents events={events} />
      ) : (
        <div>NO NEW EVENTS????</div>
      )}
      <HomePageAbout />
      <HomePageTestimonials />
      <HomePageCtaBanner isLoggedIn={isLoggedIn} />
      <HomePageFounders />
    </div>
  )
}
