import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { logger } from "~/lib/logger/logger.server"
import { createContentCache } from "./content-cache.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const load = vi.fn<() => Promise<string>>()
const cache = createContentCache({ name: "homepage", load })

beforeEach(() => {
  vi.useFakeTimers()
  load.mockReset()
  vi.mocked(logger.error).mockClear()
  cache.reset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("createContentCache", () => {
  it("loads once and serves the cached value within the TTL", async () => {
    load.mockResolvedValue("first")

    expect(await cache.get()).toBe("first")
    vi.advanceTimersByTime(60_000 - 1)
    expect(await cache.get()).toBe("first")
    expect(load).toHaveBeenCalledTimes(1)
  })

  it("loads again once the TTL has passed", async () => {
    load.mockResolvedValueOnce("first").mockResolvedValueOnce("second")

    await cache.get()
    vi.advanceTimersByTime(60_000)

    expect(await cache.get()).toBe("second")
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("serves the stale value and logs when a reload fails", async () => {
    load
      .mockResolvedValueOnce("first")
      .mockRejectedValueOnce(new Error("Sanity is down"))

    await cache.get()
    vi.advanceTimersByTime(60_000)

    expect(await cache.get()).toBe("first")
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("homepage"),
      { error: "Sanity is down" },
    )
  })

  it("rejects when nothing is cached and the load fails", async () => {
    load.mockRejectedValueOnce(new Error("Sanity is down"))

    await expect(cache.get()).rejects.toThrow("Sanity is down")
  })

  it("shares one load between concurrent calls", async () => {
    load.mockResolvedValue("first")

    const values = await Promise.all([cache.get(), cache.get(), cache.get()])

    expect(values).toEqual(["first", "first", "first"])
    expect(load).toHaveBeenCalledTimes(1)
  })
})
