import { beforeEach, describe, expect, it, vi } from "vitest"
import * as authServer from "~/business/auth/auth.server"
import { homepageContentCache } from "~/business/cms/homepage-content-cache.server"
import { homepageContentFixture } from "~/test/homepage-content-fixture"
import type { Route } from "./+types/homepage"
import { getNextEvents } from "./fetch/get-next-events"
import { loader, meta } from "./homepage"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("~/business/cms/homepage-content-cache.server", () => ({
  homepageContentCache: { get: vi.fn() },
}))

vi.mock("./fetch/get-next-events", () => ({
  getNextEvents: vi.fn(),
}))

const loaderArgs = {
  request: new Request("http://localhost/"),
  params: {},
  context: {},
} as unknown as Route.LoaderArgs

function signedInAs(userId: string | undefined) {
  vi.mocked(authServer.getContext).mockResolvedValue({
    currentUser: userId ? { id: userId } : null,
    currentProfile: userId ? { id: `profile-${userId}` } : null,
  } as unknown as Awaited<ReturnType<typeof authServer.getContext>>)
}

describe("Homepage loader", () => {
  beforeEach(() => {
    vi.mocked(getNextEvents).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    })
    vi.mocked(homepageContentCache.get).mockResolvedValue(
      homepageContentFixture,
    )
    signedInAs(undefined)
  })

  it("returns the Sanity content next to the streamed events and the login state", async () => {
    signedInAs("user-1")

    const result = await loader(loaderArgs)

    expect(result.content).toEqual(homepageContentFixture)
    expect(result.isLoggedIn).toBe(true)
    expect(result.events).toBeInstanceOf(Promise)
    await expect(result.events).resolves.toEqual([])
  })

  it("asks for as many events as the Editor set in the next events section", async () => {
    vi.mocked(homepageContentCache.get).mockResolvedValue({
      ...homepageContentFixture,
      nextEvents: { ...homepageContentFixture.nextEvents, count: 5 },
    })

    await loader(loaderArgs)

    expect(getNextEvents).toHaveBeenCalledWith(undefined, 5, true)
  })

  it("throws a 503 response when the content cannot be loaded on a cold start", async () => {
    vi.mocked(homepageContentCache.get).mockRejectedValue(
      new Error("Sanity is down"),
    )

    const thrown = await loader(loaderArgs).catch((error: unknown) => error)

    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).status).toBe(503)
  })
})

describe("Homepage meta function", () => {
  it("should return Positiv Party as the page title", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaResult = meta({} as any)

    const titleMeta = metaResult.find(
      (m) => "title" in m && m.title === "Positiv Party",
    )

    expect(titleMeta).toBeDefined()
    expect(titleMeta).toEqual({ title: "Positiv Party" })
  })

  it("should set og:title to Positiv Party", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaResult = meta({} as any)

    const ogTitleMeta = metaResult.find(
      (m) => "property" in m && m.property === "og:title",
    )

    expect(ogTitleMeta).toBeDefined()
    expect(ogTitleMeta).toMatchObject({
      property: "og:title",
      content: "Positiv Party",
    })
  })
})
