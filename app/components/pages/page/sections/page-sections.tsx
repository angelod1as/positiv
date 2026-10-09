import { Suspense } from "react"
import { Await } from "react-router"
import type { PageSection } from "~/business/cms/page.schema"
import { AboutSection } from "./about-section"
import { CtaBannerSection } from "./cta-banner-section"
import { FeedbackSection } from "./feedback-section"
import { FoundersSection } from "./founders-section"
import { NextEventsSection } from "./next-events-section"
import { NextEventsSectionSkeleton } from "./next-events-section-skeleton"
import { TestimonialsSection } from "./testimonials-section"
import type { Event } from "~types/database/entities.types"
import { PagePlaceholder } from "../placeholder/page-placeholder"
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
            fallback={<NextEventsSectionSkeleton content={section} />}
          >
            <Await resolve={events}>
              {(resolvedEvents) =>
                resolvedEvents && resolvedEvents.length > 0 ? (
                  <NextEventsSection
                    content={section}
                    events={resolvedEvents}
                  />
                ) : null
              }
            </Await>
          </Suspense>
        )
      case "about":
        return <AboutSection key={section._key} content={section} />
      case "testimonials":
        return <TestimonialsSection key={section._key} content={section} />
      case "ctaBanner":
        return (
          <CtaBannerSection
            key={section._key}
            content={section}
            isLoggedIn={isLoggedIn}
          />
        )
      case "founders":
        return <FoundersSection key={section._key} content={section} />
      case "feedback":
        return <FeedbackSection key={section._key} content={section} />
      case "richTextSection":
        return <RichTextSection key={section._key} content={section} />
      case "imageSection":
        return <ImageSection key={section._key} content={section} />
      case "placeholder":
        return (
          <PagePlaceholder
            key={section._key}
            variant="section"
            missing={section.missing}
          />
        )
    }
  })
}
