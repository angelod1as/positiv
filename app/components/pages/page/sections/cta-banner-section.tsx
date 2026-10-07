import type { PageContent } from "~/business/cms/content.schema"
import { Button } from "~/components/atoms/button/button"
import { RichText } from "~/components/atoms/rich-text/rich-text"
import { homepageCopy } from "~/copy/homepage"
import routes from "~/lib/paths"
import { SectionTitle } from "./section-title"
import { Section } from "../section/section"

const {
  auth: { LOGIN },
  dash: { DASHBOARD },
} = routes

const { ctaBanner } = homepageCopy

type CtaBannerSectionProps = {
  content: PageContent["ctaBanner"]
  isLoggedIn: boolean
}

export const CtaBannerSection = ({
  content,
  isLoggedIn,
}: CtaBannerSectionProps) => {
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
          {isLoggedIn ? (
            <Button size="lg" variant="secondary" to={DASHBOARD}>
              {ctaBanner.loggedInCta}
            </Button>
          ) : (
            <Button size="lg" variant="secondary" to={LOGIN}>
              {ctaBanner.loggedOutCta}
            </Button>
          )}
        </div>
      </div>
    </Section>
  )
}
