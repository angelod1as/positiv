import { describe, expect, it } from "vitest"

import { resolveDataset } from "./environment"

describe("resolveDataset", () => {
  it("opens development when SANITY_STUDIO_DATASET is unset", () => {
    expect(resolveDataset(undefined)).toBe("development")
  })

  it("opens development when SANITY_STUDIO_DATASET is empty", () => {
    expect(resolveDataset("")).toBe("development")
  })

  it("honours SANITY_STUDIO_DATASET when it is set", () => {
    expect(resolveDataset("production")).toBe("production")
  })
})
