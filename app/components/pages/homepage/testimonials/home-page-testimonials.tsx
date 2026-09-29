import type { HomepageContent } from "~/business/cms/homepage-content.schema"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"
import { TestimonialCard } from "./testimonial-card"

type HomePageTestimonialsProps = {
  content: HomepageContent["testimonials"]
}

export const HomePageTestimonials = ({
  content,
}: HomePageTestimonialsProps) => {
  return (
    <Section>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <HomePageTitle subtitle={content.subtitle}>
            {content.title}
          </HomePageTitle>

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
