import type { PageContent } from "~/business/cms/content.schema"
import { Button } from "~/components/atoms/button/button"
import { RichText } from "~/components/atoms/rich-text/rich-text"
import paths from "~/lib/paths"
import { SectionTitle } from "./section-title"
import { Section } from "../section/section"

type FeedbackSectionProps = {
  content: PageContent["feedback"]
}

export const FeedbackSection = ({ content }: FeedbackSectionProps) => {
  return (
    <Section hasBg>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <SectionTitle>{content.title}</SectionTitle>
            <p className="mx-auto max-w-[700px] md:text-xl">
              <RichText value={content.body} inline />
            </p>
          </div>
          <Button size="lg" variant="secondary" to={paths.root.FEEDBACK}>
            {content.ctaLabel}
          </Button>
        </div>
      </div>
    </Section>
  )
}
