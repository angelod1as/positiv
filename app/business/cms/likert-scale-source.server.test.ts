import { afterEach, describe, expect, it, vi } from "vitest"
import { logger } from "~/lib/logger/logger.server"
import { likertScaleQuery } from "./likert-scale-query"
import { getLikertScale } from "./likert-scale-source.server"

vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

const scale = {
  statements: [{ key: "exemplo-01", text: "Sou de exemplo." }],
}

function clientReturning(document: unknown) {
  return { fetch: vi.fn().mockResolvedValue(document) }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("getLikertScale", () => {
  it("reads the scale with the Likert scale query", async () => {
    const client = clientReturning(scale)

    expect(await getLikertScale(client)).toEqual(scale)
    expect(client.fetch).toHaveBeenCalledWith(likertScaleQuery)
  })

  it("returns null and logs when the singleton is not published", async () => {
    expect(await getLikertScale(clientReturning(null))).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      "The Likert scale is not published",
    )
  })

  it("returns null and logs why when the content breaks the contract", async () => {
    const broken = { statements: [] }

    expect(await getLikertScale(clientReturning(broken))).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      "The Likert scale failed validation",
      { error: expect.stringContaining("statements") },
    )
  })

  it("lets a Sanity failure reach the cache, which serves the last good scale", async () => {
    const client = { fetch: vi.fn().mockRejectedValue(new Error("down")) }

    await expect(getLikertScale(client)).rejects.toThrow("down")
  })
})
