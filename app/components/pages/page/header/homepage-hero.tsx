import type { PageContent } from "~/business/cms/content.schema"
import { RichText } from "~/components/atoms/rich-text/rich-text"
import { Section } from "../section/section"

type HomepageHeroProps = {
  content: PageContent["hero"]
}

export const HomepageHero = ({ content }: HomepageHeroProps) => {
  return (
    <Section className="w-full py-12 md:py-24 lg:py-32">
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl/[3rem] font-extrabold from-blue to-purple bg-clip-text bg-linear-to-r  tracking-tighter sm:text-5xl/[4rem] md:text-6xl/[5rem] lg:text-8xl/[7rem] text-transparent">
              {content.title}
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              <RichText value={content.subtitle} inline />
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}
