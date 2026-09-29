import { afterEach, describe, expect, it, vi } from "vitest"

async function loadConfig(dataset: string | undefined) {
  vi.stubEnv("SANITY_STUDIO_DATASET", dataset)
  vi.resetModules()
  return (await import("./sanity.config")).default
}

describe("Studio title", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("names the dataset when the Studio opens development", async () => {
    expect((await loadConfig(undefined)).title).toBe("Positiv (development)")
  })

  it("stays plain when the Studio opens production", async () => {
    expect((await loadConfig("production")).title).toBe("Positiv")
  })
})
