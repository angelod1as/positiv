import type { PageHeader } from "~/business/cms/page.schema"
import { RichText } from "~/components/atoms/rich-text/rich-text"
import { Section } from "~/components/pages/homepage/section/section"

type PageHeroProps = {
  content: Extract<PageHeader, { _type: "pageHero" }>
}

export const PageHero = ({ content }: PageHeroProps) => {
  return (
    <Section className="w-full py-10 md:py-16">
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center space-y-3 text-center">
          <h1 className="text-3xl font-extrabold from-blue to-purple bg-clip-text bg-linear-to-r tracking-tighter sm:text-4xl md:text-5xl text-transparent">
            {content.title}
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-lg">
            <RichText value={content.subtitle} inline />
          </p>
        </div>
      </div>
    </Section>
  )
}
