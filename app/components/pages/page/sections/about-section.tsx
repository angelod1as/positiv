import { HeartIcon, SparklesIcon, UsersIcon } from "lucide-react"
import type { ReactElement } from "react"
import type { PageContent } from "~/business/cms/content.schema"
import { RichText } from "~/components/atoms/rich-text/rich-text"
import { SectionTitle } from "./section-title"
import { Section } from "../section/section"
import { AboutCard } from "./about-card"

const ICONS: ReactElement<SVGSVGElement>[] = [
  <UsersIcon key="users" />,
  <HeartIcon key="heart" />,
  <SparklesIcon key="sparkles" />,
]

type AboutSectionProps = {
  content: PageContent["about"]
}

export const AboutSection = ({ content }: AboutSectionProps) => {
  return (
    <Section hasBg>
      <div className="px-4 md:px-6 flex flex-col items-center">
        <div className="flex flex-col items-center justify-center gap-4 text-center max-w-(--breakpoint-xl)">
          <SectionTitle>{content.title}</SectionTitle>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12 pt-8">
            {content.cards.map((card, index) => (
              <AboutCard key={card._key} icon={ICONS[index]} title={card.title}>
                <RichText value={card.body} />
              </AboutCard>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
