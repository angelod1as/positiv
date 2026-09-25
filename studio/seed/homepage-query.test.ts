import { evaluate, parse } from "groq-js"
import { describe, expect, it } from "vitest"

import { homepageQuery } from "../../app/business/cms/homepage-query"
import { homepageCopy } from "../../app/copy/homepage"
import { buildSeed } from "./build-seed"

const photoAssetIds = {
  julia: "image-julia123-800x800-jpg",
  angelo: "image-angelo123-800x800-jpg",
}

const { homepage, people } = buildSeed(homepageCopy, photoAssetIds)

async function runQuery(dataset: object[]) {
  return (await evaluate(parse(homepageQuery), { dataset })).get()
}

describe("homepageQuery", () => {
  it("returns every section of the homepage", async () => {
    const result = await runQuery([homepage, ...people])

    expect(Object.keys(result)).toEqual(
      expect.arrayContaining([
        "hero",
        "nextEvents",
        "about",
        "testimonials",
        "ctaBanner",
        "founders",
        "feedback",
      ]),
    )
    expect(result.hero.title).toBe(homepageCopy.hero.title)
  })

  it("returns the founders themselves, not references to them", async () => {
    const result = await runQuery([homepage, ...people])

    expect(result.founders.people).toEqual([
      expect.objectContaining({
        name: "Julia Fernandez",
        instagram: "ju.z.fernandez",
      }),
      expect.objectContaining({
        name: "Angelo Dias",
        instagram: "oicronofobico",
      }),
    ])
  })

  it("returns each photo's asset reference and alt text for the app to build URLs from", async () => {
    const result = await runQuery([homepage, ...people])

    expect(result.founders.people[0].photo).toEqual(
      expect.objectContaining({
        asset: { _type: "reference", _ref: photoAssetIds.julia },
        alt: "Foto de Julia Fernandez",
      }),
    )
  })

  it("returns nothing when the homepage has not been published", async () => {
    expect(await runQuery(people)).toBeNull()
  })
})
