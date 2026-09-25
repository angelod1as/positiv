import { describe, expect, it } from "vitest"

import { homepageCopy } from "../../app/copy/homepage"
import { validateDocumentOf } from "../test/validate"
import { buildSeed } from "./build-seed"

const photoAssetIds = {
  julia: "image-julia123-800x800-jpg",
  angelo: "image-angelo123-800x800-jpg",
}

const { homepage, people } = buildSeed(homepageCopy, photoAssetIds)

function withoutSystemFields({
  _id,
  _type,
  ...fields
}: {
  _id: string
  _type: string
}) {
  return { _type, fields }
}

describe("buildSeed", () => {
  it("builds the homepage singleton", () => {
    expect(homepage._id).toBe("homepage")
    expect(homepage._type).toBe("homepage")
  })

  it("takes the hero title from today's copy", () => {
    expect(homepage.hero.title).toBe(homepageCopy.hero.title)
  })

  it("keeps the hero subtitle's bold words", () => {
    const bold = homepage.hero.subtitle[0].children
      .filter((span) => span.marks.includes("strong"))
      .map((span) => span.text)

    expect(bold).toEqual(["não-mono", "suruba", "própria sexualidade"])
  })

  it("builds the three about cards in order, one paragraph per blank line", () => {
    expect(homepage.about.cards.map((card) => card.title)).toEqual([
      "suruba não é bagunça",
      "afeto vs putaria",
      "para quem?",
    ])
    expect(homepage.about.cards[1].body).toHaveLength(3)
  })

  it("carries every testimonial", () => {
    expect(homepage.testimonials.quotes.map((quote) => quote.author)).toEqual([
      "A., 32",
      "C., 40",
      "P., 28",
    ])
  })

  it("shows three events, as the homepage does today", () => {
    expect(homepage.nextEvents.count).toBe(3)
  })

  it("links the video on YouTube rather than its embed", () => {
    expect(homepage.founders.videoUrl).toBe(
      "https://www.youtube.com/watch?v=WIveBynr7Yc",
    )
  })

  it("labels the feedback button with today's copy", () => {
    expect(homepage.feedback.ctaLabel).toBe(homepageCopy.feedback.cta)
  })

  it("emits Julia and Angelo as people", () => {
    expect(people.map(({ _id, name }) => ({ _id, name }))).toEqual([
      { _id: "person-julia", name: "Julia Fernandez" },
      { _id: "person-angelo", name: "Angelo Dias" },
    ])
  })

  it("references both people from the founders section, in order", () => {
    expect(homepage.founders.people.map((reference) => reference._ref)).toEqual(
      ["person-julia", "person-angelo"],
    )
  })

  it("points each photo at its uploaded asset", () => {
    expect(people.map((person) => person.photo.asset._ref)).toEqual([
      photoAssetIds.julia,
      photoAssetIds.angelo,
    ])
  })

  it("italicises what the copy italicises", () => {
    const angelo = people[1]
    const italic = angelo.bio[0].children.find((span) =>
      span.marks.includes("em"),
    )

    expect(italic?.text).toBe("organizador de suruba")
  })

  it("builds a homepage the Studio would let an Editor publish", async () => {
    const { _type, fields } = withoutSystemFields(homepage)

    expect(await validateDocumentOf(_type, fields)).toEqual([])
  })

  it("builds people the Studio would let an Editor publish", async () => {
    for (const person of people) {
      const { _type, fields } = withoutSystemFields(person)

      expect(await validateDocumentOf(_type, fields)).toEqual([])
    }
  })
})
