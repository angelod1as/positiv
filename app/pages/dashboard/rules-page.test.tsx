import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/business/cms/load-rules.server", () => ({
  loadRules: vi.fn(),
}))

import { loadRules } from "~/business/cms/load-rules.server"
import { rulesFixture } from "~/test/rules-documents"
import { loader, meta } from "./rules-page"
import type { Route } from "./+types/rules-page"

const runLoader = () =>
  loader({
    request: new Request("http://localhost/dashboard/regras"),
    params: {},
  } as Route.LoaderArgs)

describe("Rules page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("hands the page the Rules", async () => {
    vi.mocked(loadRules).mockResolvedValue(rulesFixture)

    await expect(runLoader()).resolves.toEqual({ rules: rulesFixture })
  })

  it("hands the page no Rules when they cannot be loaded", async () => {
    vi.mocked(loadRules).mockResolvedValue(null)

    await expect(runLoader()).resolves.toEqual({ rules: null })
  })

  it("is titled Regras e Acordos", () => {
    const metaResult = meta({} as Route.MetaArgs)

    expect(metaResult).toContainEqual({
      title: "Regras e Acordos | Positiv Party",
    })
  })
})
