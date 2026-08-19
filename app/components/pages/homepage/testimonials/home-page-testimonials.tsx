import { Copy } from "~/components/atoms/copy/copy"
import { homepageCopy } from "~/copy/homepage"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"
import { TestimonialCard } from "./testimonial-card"

const { testimonials } = homepageCopy

export const HomePageTestimonials = () => {
  return (
    <Section>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <HomePageTitle subtitle={testimonials.subtitle}>
            {testimonials.title}
          </HomePageTitle>

          <div className="grid grid-cols-1 gap-6 md:gap-8 pt-8 max-w-3xl">
            {testimonials.quotes.map(({ author, quote }) => (
              <TestimonialCard key={author} title={author}>
                <Copy>{quote}</Copy>
              </TestimonialCard>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
