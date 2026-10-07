import type { PageContent } from "~/business/cms/content.schema"
import { SectionTitle } from "./section-title"
import { Section } from "../section/section"
import { TestimonialCard } from "./testimonial-card"

type TestimonialsSectionProps = {
  content: PageContent["testimonials"]
}

export const TestimonialsSection = ({
  content,
}: TestimonialsSectionProps) => {
  return (
    <Section>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <SectionTitle subtitle={content.subtitle}>
            {content.title}
          </SectionTitle>

          <div className="grid grid-cols-1 gap-6 md:gap-8 pt-8 max-w-3xl">
            {content.quotes.map(({ _key, author, quote }) => (
              <TestimonialCard key={_key} title={author}>
                <p>{quote}</p>
              </TestimonialCard>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
