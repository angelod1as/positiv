import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { validateValueOf } from "../../test/validate"

function personReference(key: string, ref: string) {
  return { _type: "reference", _key: key, _ref: ref }
}

const founders = {
  _type: "founders",
  title: "Quem faz a Positiv?",
  people: [
    personReference("j", "person-julia"),
    personReference("a", "person-angelo"),
  ],
  videoUrl: "https://www.youtube.com/watch?v=WIveBynr7Yc",
  videoTitle: "Vídeo de apresentação da Positiv",
}

describe("founders", () => {
  it("accepts a title, people and a video", async () => {
    expect(await validateValueOf("founders", founders)).toEqual([])
  })

  it.each(["title", "people", "videoUrl", "videoTitle"])(
    "requires the %s",
    async (field) => {
      const errors = await validateValueOf("founders", {
        ...founders,
        [field]: undefined,
      })

      expect(pathsOf(errors)).toContain(`founders.${field}`)
    },
  )

  it("rejects an empty list of people", async () => {
    const errors = await validateValueOf("founders", {
      ...founders,
      people: [],
    })

    expect(pathsOf(errors)).toContain("founders.people")
  })

  it("rejects the same person twice", async () => {
    const errors = await validateValueOf("founders", {
      ...founders,
      people: [
        personReference("j", "person-julia"),
        personReference("k", "person-julia"),
      ],
    })

    expect(pathsOf(errors)).toContain("founders.people.k")
  })

  it.each([
    "https://www.youtube.com/watch?v=WIveBynr7Yc",
    "https://youtube.com/watch?v=WIveBynr7Yc",
    "https://youtu.be/WIveBynr7Yc",
    "https://www.youtube.com/embed/WIveBynr7Yc?si=2T_SBw3EwHerW-tf",
  ])("accepts the YouTube link %s", async (videoUrl) => {
    expect(
      await validateValueOf("founders", { ...founders, videoUrl }),
    ).toEqual([])
  })

  it.each([
    "https://vimeo.com/123456",
    "http://www.youtube.com/watch?v=WIveBynr7Yc",
    "https://www.youtube.com/@positiv",
    "https://www.youtube.com.example.com/watch?v=WIveBynr7Yc",
  ])("rejects %s", async (videoUrl) => {
    const errors = await validateValueOf("founders", { ...founders, videoUrl })

    expect(pathsOf(errors)).toContain("founders.videoUrl")
  })
})
