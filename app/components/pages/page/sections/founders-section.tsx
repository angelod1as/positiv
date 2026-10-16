import type { PageContent } from "~/business/cms/content.schema"
import { RichText } from "~/components/atoms/rich-text/rich-text"
import { homepageCopy } from "~/copy/homepage"
import { youtubeEmbedUrl } from "~/lib/helpers/youtube-embed-url"
import { SectionTitle } from "./section-title"
import { Section } from "../section/section"
import { FounderCard } from "./founder-card"

const { founders } = homepageCopy

type FoundersSectionProps = {
  content: PageContent["founders"]
}

export const FoundersSection = ({ content }: FoundersSectionProps) => {
  const videoSrc = youtubeEmbedUrl(content.videoUrl)

  return (
    <Section>
      <div className="px-4 md:px-6 flex flex-col items-center gap-12">
        <div className="flex flex-col items-center justify-center space-y-4 text-center max-w-(--breakpoint-lg)">
          <SectionTitle>{content.title}</SectionTitle>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12 pt-8">
            {content.people.map(
              ({ _id, name, pronouns, instagram, bio, photo }) => (
                <FounderCard
                  key={_id}
                  personId={_id}
                  photo={photo}
                  name={name}
                  pronounsLabel={founders.pronounsLabel(pronouns)}
                  instagram={instagram}
                  instagramIconAlt={founders.instagramIconAlt}
                >
                  <RichText value={bio} />
                </FounderCard>
              ),
            )}
          </div>
        </div>
        {videoSrc && (
          <div className="w-full flex justify-center items-center">
            <div className="w-full max-w-2xl aspect-video ">
              <iframe
                className="h-full w-full rounded-lg"
                src={videoSrc}
                title={content.videoTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen={true}
              />
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
