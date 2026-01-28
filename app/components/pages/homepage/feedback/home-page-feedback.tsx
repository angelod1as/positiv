import { Button } from "~/components/atoms/button/button"
import paths from "~/lib/paths"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"

export const HomePageFeedback = () => {
  return (
    <Section hasBg>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <HomePageTitle>Nos deixe um feedback</HomePageTitle>
            <p className="mx-auto max-w-[700px] md:text-xl">
              Estamos sempre buscando melhorias em nossa comunicação e processo.
              Nos deixe um feedback anônimo (ou não).
            </p>
          </div>
          <Button size="lg" variant="secondary" to={paths.root.FEEDBACK}>
            Deixar feedback
          </Button>
        </div>
      </div>
    </Section>
  )
}
