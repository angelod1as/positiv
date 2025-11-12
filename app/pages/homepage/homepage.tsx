import { getContext } from "~/business/auth/auth.server"
import { FloatingWhatsappButton } from "~/components/atoms/floating-whatsapp-button/floating-whatsapp-button"
import { HomePageAbout } from "~/components/pages/homepage/about/about"
import { HomePageCtaBanner } from "~/components/pages/homepage/cta-banner/home-page-cta-banner"
import { HomePageFounders } from "~/components/pages/homepage/founders/home-page-founders"
import { HomePageHero } from "~/components/pages/homepage/hero/hero"
import { HomePageNextEvents } from "~/components/pages/homepage/next-events/next-events"
import { HomePageTestimonials } from "~/components/pages/homepage/testimonials/home-page-testimonials"
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
    <>
      <div>
        <HomePageHero />
        {events && events?.length > 0 && <HomePageNextEvents events={events} />}
        <HomePageAbout />
        <HomePageTestimonials />
        <HomePageCtaBanner isLoggedIn={isLoggedIn} />
        <HomePageFounders />
      </div>
      <FloatingWhatsappButton />
    </>
  )
}
