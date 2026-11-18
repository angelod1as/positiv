import { afterEach, describe, expect, it, vi } from "vitest"
import { likertScaleCache } from "./likert-scale-cache.server"

const fetch = vi.hoisted(() => vi.fn())

vi.mock("./sanity-client.server", () => ({
  createSanityClient: () => ({ fetch }),
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

const scale = {
  themes: [
    {
      name: "Tema de exemplo",
      statements: [{ key: "exemplo-01", text: "Sou de exemplo." }],
    },
  ],
  venues: {
    question: "A quais destes você já foi?",
    options: [{ key: "sauna", label: "Sauna" }],
  },
  nonMonogamySince: {
    question: "Desde quando você vive a não-monogamia?",
    notLivingLabel: "Não vivo a não-monogamia hoje",
  },
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
