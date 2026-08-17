import Angelo from "~/assets/pictures/angelo.jpg"
import Julia from "~/assets/pictures/julia.jpg"
import { Copy } from "~/components/atoms/copy/copy"
import { homepageCopy } from "~/copy/homepage"
import { HomePageTitle } from "../home-title/home-title"
import { Section } from "../section/section"
import { FounderCard } from "./founder-card"

const { founders } = homepageCopy

const PICTURES: Record<keyof typeof founders.people, string> = {
  julia: Julia,
  angelo: Angelo,
}

export const HomePageFounders = () => {
  return (
    <Section>
      <div className="px-4 md:px-6 flex flex-col items-center gap-12">
        <div className="flex flex-col items-center justify-center space-y-4 text-center max-w-(--breakpoint-lg)">
          <HomePageTitle>{founders.title}</HomePageTitle>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12 pt-8">
            {Object.entries(founders.people).map(
              ([key, { name, pronouns, instagram, bio }]) => (
                <FounderCard
                  key={key}
                  image={PICTURES[key as keyof typeof founders.people]}
                  name={name}
                  alt=""
                  pronounsLabel={founders.pronounsLabel(pronouns)}
                  instagram={instagram}
                  instagramIconAlt={founders.instagramIconAlt}
                >
                  <Copy>{bio}</Copy>
                </FounderCard>
              ),
            )}
          </div>
        </div>
        <div className="w-full flex justify-center items-center">
          <div className="w-full max-w-2xl aspect-video ">
            <iframe
              className="h-full w-full rounded-lg"
              src="https://www.youtube.com/embed/WIveBynr7Yc?si=2T_SBw3EwHerW-tf"
              title={founders.videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen={true}
            />
          </div>
        </div>
      </div>
    </Section>
  )
}
