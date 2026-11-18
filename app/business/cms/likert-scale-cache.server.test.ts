import { afterEach, describe, expect, it, vi } from "vitest"
import { likertScaleCache } from "./likert-scale-cache.server"

const fetch = vi.hoisted(() => vi.fn())

vi.mock("./sanity-client.server", () => ({
  createSanityClient: () => ({ fetch }),
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

const scale = {
  statements: [{ key: "exemplo-01", text: "Sou de exemplo." }],
}

afterEach(() => {
  likertScaleCache.reset()
  vi.clearAllMocks()
})

describe("likertScaleCache", () => {
  it("reads the scale from Sanity once and serves it from memory", async () => {
    fetch.mockResolvedValue(scale)

    expect(await likertScaleCache.get()).toEqual(scale)
    expect(await likertScaleCache.get()).toEqual(scale)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
