import { createClient } from "~/lib/supabase/client"
import { HomePageAbout } from "~/pages/homepage/components/about/about"
import { HomePageCtaBanner } from "~/pages/homepage/components/cta-banner/home-page-cta-banner"
import { HomePageFounders } from "~/pages/homepage/components/founders/home-page-founders"
import { HomePageHero } from "~/pages/homepage/components/hero/hero"
import { HomePageNextEvents } from "~/pages/homepage/components/next-events/next-events"
import { HomePageTestimonials } from "~/pages/homepage/components/testimonials/home-page-testimonials"
import { getHomepageNextEvents } from "~/pages/homepage/fetch/get-homepage-next-events"
import type { Route } from "./+types/homepage"

// TODO: Meta
export function meta() {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ]
}

// Needs to be clientLoader because getHomepageNextEvents needs new Date()
export async function clientLoader({}: Route.LoaderArgs) {
  const { supabase } = createClient()
  return await getHomepageNextEvents(supabase)
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { error, events } = loaderData
  return (
    <div>
      <HomePageHero />
      {!error && <HomePageNextEvents events={events} />}
      <HomePageAbout />
      <HomePageTestimonials />
      <HomePageCtaBanner />
      <HomePageFounders />
    </div>
  )
}
