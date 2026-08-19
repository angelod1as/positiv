import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import { homepageCopy } from "~/copy/homepage"
import paths from "~/lib/paths"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"

const { feedback } = homepageCopy

export const HomePageFeedback = () => {
  return (
    <Section hasBg>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <HomePageTitle>{feedback.title}</HomePageTitle>
            <p className="mx-auto max-w-[700px] md:text-xl">
              <Copy inline>{feedback.body}</Copy>
            </p>
          </div>
          <Button size="lg" variant="secondary" to={paths.root.FEEDBACK}>
            {feedback.cta}
          </Button>
        </div>
      </div>
    </Section>
  )
}
