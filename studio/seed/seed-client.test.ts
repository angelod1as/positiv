import { getCliClient } from "sanity/cli"
import { describe, expect, it, vi } from "vitest"

import { seedClient } from "./seed-client"

vi.mock("sanity/cli", { spy: true })

describe("seedClient", () => {
  it("writes to the dataset named on the command line, not the one in sanity.cli.ts", () => {
    const client = seedClient([
      "node",
      "seed/seed.ts",
      "--dataset",
      "development",
    ])

    expect(client.config().dataset).toBe("development")
  })

  it("reads what was published, not drafts", () => {
    const client = seedClient([
      "node",
      "seed/seed.ts",
      "--dataset",
      "development",
    ])

    expect(client.config().perspective).toBe("published")
  })

  it("refuses to hand back a client pointed anywhere but the dataset asked for", async () => {
    const { createClient } = await import("@sanity/client")
    const productionOnly = createClient({
      projectId: "8ojkallk",
      dataset: "production",
      apiVersion: "2026-09-24",
      useCdn: false,
    })
    vi.spyOn(productionOnly, "withConfig").mockReturnValue(productionOnly)
    vi.mocked(getCliClient).mockReturnValueOnce(productionOnly)

    expect(() =>
      seedClient(["node", "seed/seed.ts", "--dataset", "development"]),
    ).toThrow(/production/)
  })
})
