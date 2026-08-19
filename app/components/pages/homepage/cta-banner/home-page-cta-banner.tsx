import { Button } from "~/components/atoms/button/button"
import { Copy } from "~/components/atoms/copy/copy"
import { homepageCopy } from "~/copy/homepage"
import routes from "~/lib/paths"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"

const {
  auth: { LOGIN },
  dash: { DASHBOARD },
} = routes

const { ctaBanner } = homepageCopy

export const HomePageCtaBanner = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  return (
    <Section hasBg>
      <div className="px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <HomePageTitle>{ctaBanner.title}</HomePageTitle>
            <p className="mx-auto max-w-[700px] md:text-xl">
              <Copy inline>{ctaBanner.body}</Copy>
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
