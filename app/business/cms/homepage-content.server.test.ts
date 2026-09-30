import { beforeEach, describe, expect, it, vi } from "vitest"
import fixture from "../../../e2e/fixtures/homepage-content.json"
import { homepageContentSchema } from "./homepage-content.schema"
import { getHomepageContent } from "./homepage-content.server"
import { homepageQuery } from "./homepage-query"

const fetchMock = vi.fn<(query: string) => Promise<unknown>>()

const client = {
  fetch: fetchMock,
  config: () => ({ projectId: "8ojkallk", dataset: "development" }),
}

function respondWith(body: unknown) {
  fetchMock.mockResolvedValueOnce(body)
}

function fixtureWith(
  change: (content: typeof fixture) => void,
): typeof fixture {
  const content = structuredClone(fixture)
  change(content)
  return content
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe("getHomepageContent", () => {
  it("fetches the homepage with the homepage query", async () => {
    respondWith(fixture)

    await getHomepageContent(client)

    expect(fetchMock).toHaveBeenCalledWith(homepageQuery)
  })

  it("returns the sections as the editor wrote them", async () => {
    respondWith(fixture)

    const content = await getHomepageContent(client)

    expect(content.hero).toEqual(fixture.hero)
    expect(content.nextEvents).toEqual(fixture.nextEvents)
    expect(content.about).toEqual(fixture.about)
    expect(content.testimonials).toEqual(fixture.testimonials)
    expect(content.ctaBanner).toEqual(fixture.ctaBanner)
    expect(content.feedback).toEqual(fixture.feedback)
    expect(content.founders.title).toBe("Quem faz a Positiv?")
    expect(content.founders.videoUrl).toBe(
      "https://www.youtube.com/watch?v=WIveBynr7Yc",
    )
    expect(content.founders.people[0].bio).toEqual(
      fixture.founders.people[0].bio,
    )
  })

  it("replaces every founder photo with a finished CDN URL and its alt text", async () => {
    respondWith(fixture)

    const content = await getHomepageContent(client)

    expect(content.founders.people.map(({ photo }) => photo)).toEqual([
      {
        url: "https://cdn.sanity.io/images/8ojkallk/development/bd2c80be2afff6412d060425ab79204807222a12-1104x1104.jpg?w=320&h=320&fit=crop&auto=format",
        alt: "Foto de Julia Fernandez",
        width: 320,
        height: 320,
      },
      {
        url: "https://cdn.sanity.io/images/8ojkallk/development/f3da75e8d48ca346fcca68a8849ce6d7ed0f4fc9-960x960.jpg?w=320&h=320&fit=crop&auto=format",
        alt: "Foto de Angelo Dias",
        width: 320,
        height: 320,
      },
    ])
  })

  it("returns content that satisfies the shared homepage contract", async () => {
    respondWith(fixture)

    const content = await getHomepageContent(client)

    expect(homepageContentSchema.parse(content)).toEqual(content)
  })

  it("crops the photo to the editor's crop and hotspot", async () => {
    respondWith(
      fixtureWith((content) => {
        Object.assign(content.founders.people[0].photo, {
          crop: { top: 0, bottom: 0.5, left: 0, right: 0.5 },
          hotspot: { x: 0.25, y: 0.25, width: 0.2, height: 0.2 },
        })
      }),
    )

    const content = await getHomepageContent(client)

    expect(content.founders.people[0].photo.url).toContain("rect=0,0,552,552")
  })

  it("builds image URLs on Sanity's CDN even when the API goes through another host", async () => {
    respondWith(fixture)
    const proxied = {
      ...client,
      config: () => ({
        ...client.config(),
        apiHost: "http://localhost:3999",
      }),
    }

    const content = await getHomepageContent(proxied)

    expect(content.founders.people[0].photo.url).toMatch(
      /^https:\/\/cdn\.sanity\.io\/images\/8ojkallk\/development\//,
    )
  })

  it("names the missing field when the content fails validation", async () => {
    respondWith(
      fixtureWith((content) => {
        Reflect.deleteProperty(content.hero, "title")
      }),
    )

    await expect(getHomepageContent(client)).rejects.toThrow(/hero\.title/)
  })

  it("rejects rich text that is a plain string", async () => {
    respondWith(
      fixtureWith((content) => {
        Object.assign(content.hero, { subtitle: "para amantes" })
      }),
    )

    await expect(getHomepageContent(client)).rejects.toThrow(/hero\.subtitle/)
  })

  it("rejects the whole content when a rich-text link has an unsafe address", async () => {
    respondWith(
      fixtureWith((content) => {
        const [block] = content.hero.subtitle
        Object.assign(block, {
          markDefs: [
            { _key: "l1", _type: "link", href: "javascript:alert(1)" },
          ],
        })
        block.children[0].marks = ["l1"]
      }),
    )

    await expect(getHomepageContent(client)).rejects.toThrow(
      /hero\.subtitle\[0\]\.markDefs\[0\]\.href/,
    )
  })

  it.each([
    ["about.cards", (content: typeof fixture) => content.about.cards.pop()],
    [
      "testimonials.quotes",
      (content: typeof fixture) => content.testimonials.quotes.splice(0),
    ],
    [
      "founders.people",
      (content: typeof fixture) => content.founders.people.splice(0),
    ],
  ])(
    "rejects %s with fewer items than the Studio allows",
    async (path, change) => {
      respondWith(fixtureWith(change))

      await expect(getHomepageContent(client)).rejects.toThrow(
        new RegExp(path.replace(".", "\\.")),
      )
    },
  )

  it("says so when no homepage is published", async () => {
    respondWith(null)

    await expect(getHomepageContent(client)).rejects.toThrow(
      "No published homepage document found in Sanity",
    )
  })
})
