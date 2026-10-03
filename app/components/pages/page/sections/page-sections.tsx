import { Suspense } from "react"
import { Await } from "react-router"
import type { PageSection } from "~/business/cms/page.schema"
import { HomePageAbout } from "~/components/pages/homepage/about/about"
import { HomePageCtaBanner } from "~/components/pages/homepage/cta-banner/home-page-cta-banner"
import { HomePageFeedback } from "~/components/pages/homepage/feedback/home-page-feedback"
import { HomePageFounders } from "~/components/pages/homepage/founders/home-page-founders"
import { HomePageNextEvents } from "~/components/pages/homepage/next-events/next-events"
import { HomePageNextEventsSkeleton } from "~/components/pages/homepage/next-events/next-events-skeleton"
import { HomePageTestimonials } from "~/components/pages/homepage/testimonials/home-page-testimonials"
import type { Event } from "~types/database/entities.types"
import { ImageSection } from "./image-section"
import { RichTextSection } from "./rich-text-section"

type PageSectionsProps = {
  sections: PageSection[]
  events: Promise<Event[] | undefined> | undefined
  isLoggedIn: boolean
}

export const PageSections = ({
  sections,
  events,
  isLoggedIn,
}: PageSectionsProps) => {
  return sections.map((section) => {
    switch (section._type) {
      case "nextEvents":
        return (
          <Suspense
            key={section._key}
            fallback={<HomePageNextEventsSkeleton content={section} />}
          >
            <Await resolve={events}>
              {(resolvedEvents) =>
                resolvedEvents && resolvedEvents.length > 0 ? (
                  <HomePageNextEvents
                    content={section}
                    events={resolvedEvents}
                  />
                ) : null
              }
            </Await>
          </Suspense>
        )
      case "about":
        return <HomePageAbout key={section._key} content={section} />
      case "testimonials":
        return <HomePageTestimonials key={section._key} content={section} />
      case "ctaBanner":
        return (
          <HomePageCtaBanner
            key={section._key}
            content={section}
            isLoggedIn={isLoggedIn}
          />
        )
      case "founders":
        return <HomePageFounders key={section._key} content={section} />
      case "feedback":
        return <HomePageFeedback key={section._key} content={section} />
      case "richTextSection":
        return <RichTextSection key={section._key} content={section} />
      case "imageSection":
        return <ImageSection key={section._key} content={section} />
    }
  })
}
