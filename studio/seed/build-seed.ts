import type { homepageCopy } from "../../app/copy/homepage"
import { markdownToPortableText } from "./markdown-to-portable-text"

type HomepageCopy = typeof homepageCopy
type Founder = keyof HomepageCopy["founders"]["people"]

const introductionVideo = "https://www.youtube.com/watch?v=WIveBynr7Yc"

function personId(founder: string) {
  return `person-${founder}`
}

export function buildSeed(
  copy: HomepageCopy,
  photoAssetIds: Record<Founder, string>,
) {
  const founders = Object.entries(copy.founders.people) as [
    Founder,
    HomepageCopy["founders"]["people"][Founder],
  ][]

  const people = founders.map(
    ([founder, { name, pronouns, instagram, bio }]) => ({
      _id: personId(founder),
      _type: "person",
      name,
      pronouns,
      instagram,
      photo: {
        _type: "image",
        asset: { _type: "reference", _ref: photoAssetIds[founder] },
        alt: `Foto de ${name}`,
      },
      bio: markdownToPortableText(bio),
    }),
  )

  const homepage = {
    _id: "homepage",
    _type: "homepage",
    hero: {
      _type: "hero",
      title: copy.hero.title,
      subtitle: markdownToPortableText(copy.hero.subtitle),
    },
    nextEvents: {
      _type: "nextEvents",
      title: copy.nextEvents.title,
      subtitle: copy.nextEvents.subtitle,
      count: 3,
    },
    about: {
      _type: "about",
      title: copy.about.title,
      cards: Object.entries(copy.about.cards).map(([key, { title, body }]) => ({
        _type: "aboutCard",
        _key: key,
        title,
        body: markdownToPortableText(body),
      })),
    },
    testimonials: {
      _type: "testimonials",
      title: copy.testimonials.title,
      subtitle: copy.testimonials.subtitle,
      quotes: copy.testimonials.quotes.map(({ author, quote }, index) => ({
        _type: "testimonial",
        _key: `quote${index}`,
        author,
        quote,
      })),
    },
    ctaBanner: {
      _type: "ctaBanner",
      title: copy.ctaBanner.title,
      body: markdownToPortableText(copy.ctaBanner.body),
    },
    founders: {
      _type: "founders",
      title: copy.founders.title,
      people: founders.map(([founder]) => ({
        _type: "reference",
        _key: founder,
        _ref: personId(founder),
      })),
      videoUrl: introductionVideo,
      videoTitle: copy.founders.videoTitle,
    },
    feedback: {
      _type: "feedback",
      title: copy.feedback.title,
      body: markdownToPortableText(copy.feedback.body),
      ctaLabel: copy.feedback.cta,
    },
  }

  return { homepage, people }
}
