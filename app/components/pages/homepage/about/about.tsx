import { HeartIcon, SparklesIcon, UsersIcon } from "lucide-react"
import { Copy } from "~/components/atoms/copy/copy"
import { homepageCopy } from "~/copy/homepage"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"
import { AboutCard } from "./about-card"

const { title, cards } = homepageCopy.about

const ICONS = {
  notAMess: <UsersIcon />,
  affection: <HeartIcon />,
  forWhom: <SparklesIcon />,
}

export const HomePageAbout = () => {
  return (
    <Section hasBg>
      <div className="px-4 md:px-6 flex flex-col items-center">
        <div className="flex flex-col items-center justify-center gap-4 text-center max-w-(--breakpoint-xl)">
          <HomePageTitle>{title}</HomePageTitle>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12 pt-8">
            {Object.entries(cards).map(([key, card]) => (
              <AboutCard
                key={key}
                icon={ICONS[key as keyof typeof ICONS]}
                title={card.title}
              >
                <Copy>{card.body}</Copy>
              </AboutCard>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
