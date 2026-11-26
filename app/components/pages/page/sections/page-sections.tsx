import { type MouseEvent, Suspense } from "react"
import { Await } from "react-router"
import type { PageSection } from "~/business/cms/page.schema"
import type { Rule } from "~/business/cms/rules.schema"
import { useAnalytics } from "~/lib/hooks/use-analytics"
import { AboutSection } from "./about-section"
import { CalloutSection } from "./callout-section"
import { CtaBannerSection } from "./cta-banner-section"
import { FeedbackSection } from "./feedback-section"
import { FoundersSection } from "./founders-section"
import { NextEventsSection } from "./next-events-section"
import { NextEventsSectionSkeleton } from "./next-events-section-skeleton"
import { TestimonialsSection } from "./testimonials-section"
import type { Event } from "~types/database/entities.types"
import { PagePlaceholder } from "../placeholder/page-placeholder"
import { ChartSection } from "./chart-section"
import { ImageSection } from "./image-section"
import { RichTextSection } from "./rich-text-section"
import { RulesSection } from "./rules-section"
import { SideBySideSection } from "./side-by-side-section"
import { StatsSection } from "./stats-section"
import { SystemComponentSection } from "./system-component-section"

type PageSectionsProps = {
  page: string
  sections: PageSection[]
  events: Promise<Event[] | undefined> | undefined
  isLoggedIn: boolean
  privateRules?: Rule[] | null
}

const linkLabel = (link: HTMLAnchorElement) =>
  link.textContent?.trim() ||
  link.getAttribute("aria-label") ||
  link.querySelector("img")?.alt ||
  ""

export const PageSections = ({
  page,
  sections,
  events,
  isLoggedIn,
  privateRules = null,
}: PageSectionsProps) => {
  const { track } = useAnalytics()

  // Tracked here, not in each Section, so a link an Editor adds anywhere in a
  // Section is counted without a code change.
  const trackCta = (section: string) => (event: MouseEvent<HTMLElement>) => {
    if (!(event.target instanceof Element)) return
    const link = event.target.closest("a")
    if (!link) return
    track("page_cta_clicked", { page, section, label: linkLabel(link) })
  }

  return sections.map((section, index) => (
    <div
      key={section._key}
      className="contents"
      onClick={trackCta(section._type)}
    >
      {renderSection(
        section,
        events,
        isLoggedIn,
        sections[index - 1]?._type === "callout",
        privateRules,
      )}
    </div>
  ))
}

const renderSection = (
  section: PageSection,
  events: PageSectionsProps["events"],
  isLoggedIn: boolean,
  followsCallout: boolean,
  privateRules: Rule[] | null,
) => {
  switch (section._type) {
    case "nextEvents":
      return (
        <Suspense fallback={<NextEventsSectionSkeleton content={section} />}>
          <Await resolve={events}>
            {(resolvedEvents) =>
              resolvedEvents ? (
                <NextEventsSection content={section} events={resolvedEvents} />
              ) : null
            }
          </Await>
        </Suspense>
      )
    case "about":
      return <AboutSection content={section} />
    case "testimonials":
      return <TestimonialsSection content={section} />
    case "ctaBanner":
      return <CtaBannerSection content={section} isLoggedIn={isLoggedIn} />
    case "founders":
      return <FoundersSection content={section} />
    case "feedback":
      return <FeedbackSection content={section} />
    case "richTextSection":
      return <RichTextSection content={section} />
    case "imageSection":
      return <ImageSection content={section} />
    case "statsSection":
      return <StatsSection content={section} />
    case "chartSection":
      return <ChartSection content={section} />
    case "callout":
      return (
        <CalloutSection content={section} followsCallout={followsCallout} />
      )
    case "sideBySide":
      return <SideBySideSection content={section} />
    case "systemComponent":
      return <SystemComponentSection content={section} />
    case "rulesSection":
      return <RulesSection content={section} privateRules={privateRules} />
    case "placeholder":
      return <PagePlaceholder variant="section" missing={section.missing} />
  }
}
